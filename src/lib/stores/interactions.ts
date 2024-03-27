import { Client } from "logos/client";
import { Logger } from "logos/logger";

type InteractionCallbackData = Omit<Discord.InteractionCallbackData, "flags">;
type EmbedOrCallbackData = Discord.CamelizedDiscordEmbed | InteractionCallbackData;
class InteractionStore {
	readonly log: Logger;

	readonly #bot: Discord.Bot;
	readonly #interactions: Map<bigint, Logos.Interaction>;

	/** ⬜ The action should have succeeded if not for the bot's limitations. */
	get unsupported(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.unsupported });
	}

	/** 🟦 Informational message. */
	get notice(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.notice });
	}

	/** @see {@link notice()} */
	get noticed(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.notice });
	}

	/**
	 * 🟩 The action intended to be performed with the interaction succeeded.
	 *
	 * @remarks
	 * 🟦 Shows up as a notice if the reply is visible to.
	 */
	get success(): InteractionStore["reply"] {
		return async (interaction, embedOrData, flags) => {
			if (flags?.visible) {
				return this.notice(interaction, embedOrData, flags);
			}

			return this.#buildColouredReplier({ colour: constants.colours.success })(interaction, embedOrData, flags);
		};
	}

	// TODO(vxern): This is not aware of the visibility of the original postponed reply, and thus cannot decide
	//  whether to show a success or a notice.
	/** @see {@link success()} */
	get succeeded(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.success });
	}

	/** 🟧 The user tried to do something that isn't technically invalid, but which the bot will not allow for. */
	get pushback(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.pushback });
	}

	/** @see {@link pushback()} */
	get pushedBack(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.pushback });
	}

	/** 🟨 The user unintentionally did something wrong. */
	get warning(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.warning });
	}

	/** @see {@link warning()} */
	get warned(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.warning });
	}

	/** 🟥 The user (assumably) intentionally tried to do something wrong. */
	get error(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.error });
	}

	/** @see {@link error()} */
	get errored(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.error });
	}

	/** 🔺 The bot failed to do something that should have otherwise happened just fine. */
	get failure(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.failure });
	}

	/** @see {@link failure()} */
	get failed(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.failure });
	}

	/** ⬛ The bot had an outage or encountered a serious issue. */
	get death(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.death });
	}

	/** @see {@link death()} */
	get died(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.death });
	}

	constructor(client: Client, { bot }: { bot: Discord.Bot }) {
		this.log = Logger.create({ identifier: "Interactions", isDebug: client.environment.isDebug });

		this.#bot = bot;
		this.#interactions = new Map();
	}

	static spoofInteraction<Interaction extends Logos.Interaction>(
		interaction: Interaction,
		{ using, parameters }: { using: Logos.Interaction; parameters?: Interaction["parameters"] },
	): Interaction {
		return {
			...interaction,
			parameters: { ...interaction.parameters, ...parameters },
			type: Discord.InteractionTypes.ApplicationCommand,
			token: using.token,
			id: using.id,
		};
	}

	registerInteraction(interaction: Logos.Interaction): void {
		this.#interactions.set(interaction.id, interaction);
	}

	unregisterInteraction(interactionId: bigint): Logos.Interaction | undefined {
		const interaction = this.#interactions.get(interactionId);
		if (interaction === undefined) {
			return undefined;
		}

		this.#interactions.delete(interactionId);

		return interaction;
	}

	async acknowledge(interaction: Logos.Interaction): Promise<void> {
		await this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.DeferredUpdateMessage,
			})
			.catch((reason) => this.log.warn("Failed to acknowledge interaction:", reason));
	}

	async postponeReply(interaction: Logos.Interaction, { visible = false } = {}): Promise<void> {
		await this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.DeferredChannelMessageWithSource,
				data: !visible ? { flags: Discord.MessageFlags.Ephemeral } : {},
			})
			.catch((reason) => this.log.warn("Failed to postpone reply to interaction:", reason));
	}

	async reply(
		interaction: Logos.Interaction,
		embedOrData: EmbedOrCallbackData,
		{ visible = false } = {},
	): Promise<void> {
		const data = getInteractionCallbackData(embedOrData);

		if (!visible) {
			data.flags = Discord.MessageFlags.Ephemeral;
		}

		await this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.ChannelMessageWithSource,
				data,
			})
			.catch((reason) => this.log.warn("Failed to reply to interaction:", reason));
	}

	async editReply(interaction: Logos.Interaction, embedOrData: EmbedOrCallbackData): Promise<void> {
		await this.#bot.rest
			.editOriginalInteractionResponse(interaction.token, getInteractionCallbackData(embedOrData))
			.catch((reason) => this.log.warn("Failed to edit reply to interaction:", reason));
	}

	async deleteReply(interaction: Logos.Interaction): Promise<void> {
		await this.#bot.rest
			.deleteOriginalInteractionResponse(interaction.token)
			.catch((reason) => this.log.warn("Failed to delete reply to interaction:", reason));
	}

	async respond(interaction: Logos.Interaction, choices: Discord.ApplicationCommandOptionChoice[]): Promise<void> {
		return this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: { choices },
			})
			.catch((reason) => this.log.warn("Failed to respond to autocomplete interaction:", reason));
	}

	async displayModal(
		interaction: Logos.Interaction,
		data: Omit<Discord.InteractionCallbackData, "flags">,
	): Promise<void> {
		return this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.Modal,
				data,
			})
			.catch((reason) => this.log.warn("Failed to show modal:", reason));
	}

	#buildColouredReplier({ colour }: { colour: number }): InteractionStore["reply"] {
		return async (interaction, embedOrData, flags) => {
			setCallbackColour(embedOrData, { colour });

			await this.reply(interaction, embedOrData, flags);
		};
	}

	#buildColouredReplyEditor({ colour }: { colour: number }): InteractionStore["editReply"] {
		return async (interaction, embedOrData) => {
			setCallbackColour(embedOrData, { colour });

			await this.editReply(interaction, embedOrData);
		};
	}
}

function isEmbed(embedOrData: EmbedOrCallbackData): embedOrData is Discord.CamelizedDiscordEmbed {
	return "title" in embedOrData || "description" in embedOrData || "fields" in embedOrData;
}

function getInteractionCallbackData(embedOrData: EmbedOrCallbackData): Discord.InteractionCallbackData {
	if (isEmbed(embedOrData)) {
		return { embeds: [embedOrData] };
	}

	return embedOrData;
}

function setCallbackColour(embedOrData: EmbedOrCallbackData, { colour }: { colour: number }): EmbedOrCallbackData {
	if (isEmbed(embedOrData)) {
		embedOrData.color = colour;
	} else if (embedOrData.embeds !== undefined) {
		for (const embed of embedOrData.embeds) {
			embed.color = colour;
		}
	}

	return embedOrData;
}

export { InteractionStore };
