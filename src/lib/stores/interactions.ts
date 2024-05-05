import { getSnowflakeFromIdentifier } from "logos:constants/patterns";
import { trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { Logger } from "logos/logger";

type InteractionCallbackData = Omit<Discord.InteractionCallbackData, "flags">;
type EmbedOrCallbackData = Discord.CamelizedDiscordEmbed | InteractionCallbackData;
interface ReplyData {
	readonly ephemeral: boolean;
}
class InteractionStore {
	readonly log: Logger;

	readonly #client: Client;

	readonly #_interactions: Map<bigint, Logos.Interaction>;
	readonly #_replies: Map<string, ReplyData>;
	readonly #_messages: Map<string, string>;

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
				return await this.notice(interaction, embedOrData, flags);
			}

			return this.#buildColouredReplier({ colour: constants.colours.success })(interaction, embedOrData, flags);
		};
	}

	/** @see {@link success()} */
	get succeeded(): InteractionStore["editReply"] {
		return async (interaction, embedOrData) => {
			const replyData = this.#_replies.get(interaction.token)!;
			if (!replyData.ephemeral) {
				return await this.noticed(interaction, embedOrData);
			}

			return this.#buildColouredReplyEditor({ colour: constants.colours.success })(interaction, embedOrData);
		};
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

	constructor(client: Client) {
		this.log = Logger.create({ identifier: "Interactions", isDebug: client.environment.isDebug });

		this.#client = client;

		this.#_interactions = new Map();
		this.#_replies = new Map();
		this.#_messages = new Map();
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
		this.#_interactions.set(interaction.id, interaction);
	}

	unregisterInteraction(interactionId: bigint): Logos.Interaction | undefined {
		const interaction = this.#_interactions.get(interactionId);
		if (interaction === undefined) {
			return undefined;
		}

		this.#_interactions.delete(interactionId);

		return interaction;
	}

	registerMessage(interaction: Logos.Interaction, { messageId }: { messageId: string }): void {
		this.#_messages.set(interaction.token, messageId);
	}

	unregisterMessage(interaction: Logos.Interaction): void {
		this.#_messages.delete(interaction.token);
	}

	async acknowledge(interaction: Logos.Interaction): Promise<void> {
		if (interaction.type === Discord.InteractionTypes.ApplicationCommand) {
			await this.postponeReply(interaction);
			await this.deleteReply(interaction);
			return;
		}

		await this.#client.bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.DeferredUpdateMessage,
			})
			.catch((reason) => this.log.warn("Failed to acknowledge interaction:", reason));
	}

	async postponeReply(interaction: Logos.Interaction, { visible = false } = {}): Promise<void> {
		this.#_replies.set(interaction.token, { ephemeral: !visible });

		if (interaction.parameters["@repeat"]) {
			const strings = {
				thinking: this.#client.localise("interactions.thinking", interaction.guildLocale)(),
			};

			const message = await this.#client.bot.rest
				.sendMessage(interaction.channelId!, {
					embeds: [
						{
							description: strings.thinking,
							color: constants.colours.notice,
						},
					],
				})
				.catch((reason) => {
					this.log.warn("Failed to postpone message reply to repeated interaction:", reason);
					return undefined;
				});
			if (message === undefined) {
				return;
			}

			this.registerMessage(interaction, { messageId: message.id });
			return;
		}

		await this.#client.bot.rest
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

		this.#_replies.set(interaction.token, { ephemeral: !visible });

		if (interaction.parameters["@repeat"]) {
			const message = await this.#client.bot.rest.sendMessage(interaction.channelId!, data).catch((reason) => {
				this.log.warn("Failed to make message reply to repeated interaction:", reason);
				return undefined;
			});
			if (message === undefined) {
				return;
			}

			this.registerMessage(interaction, { messageId: message.id });
			return;
		}

		await this.#client.bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.ChannelMessageWithSource,
				data,
			})
			.catch((reason) => this.log.warn("Failed to reply to interaction:", reason));
	}

	async editReply(interaction: Logos.Interaction, embedOrData: EmbedOrCallbackData): Promise<void> {
		const data = getInteractionCallbackData(embedOrData);

		if (interaction.parameters["@repeat"]) {
			const messageId = this.#_messages.get(interaction.token)!;

			await this.#client.bot.rest.editMessage(interaction.channelId!, messageId, data).catch((reason) => {
				this.log.warn("Failed to edit message reply made to repeated interaction:", reason);
				return undefined;
			});

			return;
		}

		await this.#client.bot.rest
			.editOriginalInteractionResponse(interaction.token, data)
			.catch((reason) => this.log.warn("Failed to edit reply to interaction:", reason));
	}

	async deleteReply(interaction: Logos.Interaction): Promise<void> {
		if (interaction.parameters["@repeat"]) {
			const messageId = this.#_messages.get(interaction.token)!;

			this.#_messages.delete(interaction.token);

			await this.#client.bot.rest.deleteMessage(interaction.channelId!, messageId).catch((reason) => {
				this.log.warn("Failed to delete message reply made to repeated interaction:", reason);
				return undefined;
			});

			return;
		}

		await this.#client.bot.rest
			.deleteOriginalInteractionResponse(interaction.token)
			.catch((reason) => this.log.warn("Failed to delete reply to interaction:", reason));
	}

	async respond(interaction: Logos.Interaction, choices: Discord.ApplicationCommandOptionChoice[]): Promise<void> {
		return this.#client.bot.rest
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
		return this.#client.bot.rest
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

	#_resolveIdentifierToMembers({
		guildId,
		seekerUserId,
		identifier,
		options,
	}: {
		guildId: bigint;
		seekerUserId: bigint;
		identifier: string;
		options?: Partial<MemberNarrowingOptions>;
	}): [members: Logos.Member[], isResolved: boolean] | undefined {
		if (identifier.trim().length === 0) {
			return [[], false];
		}

		const seeker = this.#client.entities.members.get(guildId)?.get(seekerUserId);
		if (seeker === undefined) {
			return undefined;
		}

		const guild = this.#client.entities.guilds.get(guildId);
		if (guild === undefined) {
			return undefined;
		}

		const moderatorRoleIds = guild.roles
			.array()
			.filter((role) => role.permissions.has("MODERATE_MEMBERS"))
			.map((role) => role.id);

		const id = getSnowflakeFromIdentifier(identifier);
		if (id !== undefined) {
			const member = this.#client.entities.members.get(guildId)?.get(BigInt(id));
			if (member === undefined) {
				return undefined;
			}

			if (options?.restrictToSelf && member.id !== seeker.id) {
				return undefined;
			}

			if (options?.restrictToNonSelf && member.id === seeker.id) {
				return undefined;
			}

			if (options?.excludeModerators && moderatorRoleIds.some((roleId) => member.roles.includes(roleId))) {
				return undefined;
			}

			return [[member], true];
		}

		const cachedMembers = options?.restrictToSelf ? [seeker] : guild.members.array();
		const members = cachedMembers.filter(
			(member) =>
				(options?.restrictToNonSelf ? member.user?.id !== seeker.user?.id : true) &&
				(options?.excludeModerators ? !moderatorRoleIds.some((roleId) => member.roles.includes(roleId)) : true),
		);

		if (constants.patterns.discord.userHandle.old.test(identifier)) {
			const identifierLowercase = identifier.toLowerCase();
			const member = members.find(
				(member) =>
					member.user !== undefined &&
					`${member.user.username.toLowerCase()}#${member.user.discriminator}`.includes(identifierLowercase),
			);
			if (member === undefined) {
				return [[], false];
			}

			return [[member], true];
		}

		if (constants.patterns.discord.userHandle.new.test(identifier)) {
			const identifierLowercase = identifier.toLowerCase();
			const member = members.find((member) => member.user?.username?.toLowerCase().includes(identifierLowercase));
			if (member === undefined) {
				return [[], false];
			}

			return [[member], true];
		}

		const identifierLowercase = identifier.toLowerCase();
		const matchedMembers = members.filter((member) => {
			if (member.user?.toggles?.has("bot") && !options?.includeBots) {
				return false;
			}

			if (
				member.user &&
				`${member.user.username.toLowerCase()}#${member.user.discriminator}`.includes(identifierLowercase)
			) {
				return true;
			}

			if (member.user?.username.toLowerCase().includes(identifierLowercase)) {
				return true;
			}

			if (member.nick?.toLowerCase().includes(identifierLowercase)) {
				return true;
			}

			return false;
		});

		return [matchedMembers, false];
	}

	resolveInteractionToMember(
		interaction: Logos.Interaction,
		{
			identifier,
			options,
		}: {
			identifier: string;
			options?: Partial<MemberNarrowingOptions>;
		},
	): Logos.Member | undefined {
		const result = this.#_resolveIdentifierToMembers({
			guildId: interaction.guildId,
			seekerUserId: interaction.user.id,
			identifier,
			options,
		});
		if (result === undefined) {
			return;
		}

		const [matchedMembers, isResolved] = result;
		if (isResolved) {
			return matchedMembers.at(0);
		}

		if (matchedMembers.length === 0) {
			if (
				interaction.type === Discord.InteractionTypes.ApplicationCommand ||
				interaction.type === Discord.InteractionTypes.MessageComponent ||
				interaction.type === Discord.InteractionTypes.ModalSubmit
			) {
				const strings = constants.contexts.invalidUser({ localise: this.#client.localise, locale: interaction.locale });
				this.error(interaction, {
					title: strings.title,
					description: strings.description,
				});

				return undefined;
			}

			return undefined;
		}

		return matchedMembers.at(0);
	}

	async autocompleteMembers(
		interaction: Logos.Interaction,
		{
			identifier,
			options,
		}: {
			identifier: string;
			options?: Partial<MemberNarrowingOptions>;
		},
	): Promise<void> {
		const identifierTrimmed = identifier.trim();
		if (identifierTrimmed.length === 0) {
			const locale = interaction.locale;

			const strings = {
				autocomplete: this.#client.localise("autocomplete.user", locale)(),
			};

			await this.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);

			return;
		}

		const result = this.#_resolveIdentifierToMembers({
			guildId: interaction.guildId,
			seekerUserId: interaction.user.id,
			identifier: identifierTrimmed,
			options,
		});
		if (result === undefined) {
			return;
		}

		const [matchedMembers, _] = result;

		const users: Logos.User[] = [];
		for (const member of matchedMembers) {
			if (users.length === 20) {
				break;
			}

			const user = member.user;
			if (user === undefined) {
				continue;
			}

			users.push(user);
		}

		await this.respond(
			interaction,
			users.map((user) => ({
				name: this.#client.diagnostics.user(user, { prettify: true }),
				value: user.id.toString(),
			})),
		);
	}
}

interface MemberNarrowingOptions {
	readonly includeBots: boolean;
	readonly restrictToSelf: boolean;
	readonly restrictToNonSelf: boolean;
	readonly excludeModerators: boolean;
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
