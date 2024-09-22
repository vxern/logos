import { timestamp, trim } from "logos:constants/formatting";
import { getSnowflakeFromIdentifier } from "logos:constants/patterns";
import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors.ts";
import type { CommandStore } from "logos/stores/commands.ts";
import type pino from "pino";

type InteractionCallbackData = Omit<Discord.InteractionCallbackData, "flags">;
type EmbedOrCallbackData = Discord.CamelizedDiscordEmbed | InteractionCallbackData;
interface ReplyData {
	readonly ephemeral: boolean;
}
type ReplyVisibility = "public" | "private";
class InteractionStore {
	readonly log: pino.Logger;

	readonly #client: Client;
	readonly #commands: CommandStore;
	readonly #interactions: Map<bigint, Logos.Interaction>;
	readonly #replies: Map<string, ReplyData>;
	readonly #messages: Map<string, bigint>;
	readonly #interactionCollector: InteractionCollector;

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
	 * 🟦 Shows up as a notice if the reply is public.
	 */
	get success(): InteractionStore["reply"] {
		return async (interaction, embedOrData, flags) => {
			if (flags?.visible) {
				return this.notice(interaction, embedOrData, flags);
			}

			return this.#buildColouredReplier({ colour: constants.colours.success })(interaction, embedOrData, flags);
		};
	}

	/** @see {@link success()} */
	get succeeded(): InteractionStore["editReply"] {
		return async (interaction, embedOrData) => {
			const replyData = this.#replies.get(interaction.token)!;
			if (!replyData.ephemeral) {
				return this.noticed(interaction, embedOrData);
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

	constructor(client: Client, { commands }: { commands: CommandStore }) {
		this.log = client.log.child({ name: "InteractionStore" });

		this.#client = client;
		this.#commands = commands;
		this.#interactions = new Map();
		this.#replies = new Map();
		this.#messages = new Map();
		this.#interactionCollector = new InteractionCollector(client, {
			anyType: true,
			anyCustomId: true,
			isPermanent: true,
		});
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

	async setup(): Promise<void> {
		this.#interactionCollector.onInteraction(this.handleInteraction.bind(this));

		await this.#client.registerInteractionCollector(this.#interactionCollector);
	}

	async teardown(): Promise<void> {
		this.#interactionCollector.close();
	}

	async handleInteraction(interaction: Logos.Interaction): Promise<void> {
		// If it's a "none" message interaction, just acknowledge and good to go.
		if (
			interaction.type === Discord.InteractionTypes.MessageComponent &&
			interaction.metadata[0] === constants.components.none
		) {
			this.acknowledge(interaction).ignore();

			this.log.info("Component interaction acknowledged.");

			return;
		}

		if (
			interaction.type !== Discord.InteractionTypes.ApplicationCommand &&
			interaction.type !== Discord.InteractionTypes.ApplicationCommandAutocomplete
		) {
			return;
		}

		this.log.info(`Receiving ${this.#client.diagnostics.interaction(interaction)}...`);

		const handle = this.#commands.getHandler(interaction);
		if (handle === undefined) {
			this.log.warn(
				`Could not retrieve handler for ${this.#client.diagnostics.interaction(
					interaction,
				)}. Is the command registered?`,
			);
			return;
		}

		const executedAt = Date.now();

		if (
			interaction.type !== Discord.InteractionTypes.ApplicationCommandAutocomplete &&
			this.#commands.hasRateLimit(interaction)
		) {
			const rateLimit = this.#commands.getRateLimit(interaction, { executedAt });
			if (rateLimit !== undefined) {
				const nextUsable = rateLimit.nextAllowedUsageTimestamp - executedAt;

				this.log.warn(
					`User rate-limited on ${this.#client.diagnostics.interaction(interaction)}. Next usable in ${Math.ceil(
						nextUsable / 1000,
					)} seconds.`,
				);

				const strings = constants.contexts.rateLimited({
					localise: this.#client.localise.bind(this),
					locale: interaction.locale,
				});
				this.warning(interaction, {
					title: strings.title,
					description: `${strings.description.tooManyUses({
						times: constants.defaults.COMMAND_RATE_LIMIT.uses,
					})}\n\n${strings.description.cannotUseUntil({
						relative_timestamp: timestamp(rateLimit.nextAllowedUsageTimestamp, {
							format: "relative",
						}),
					})}`,
				}).ignore();

				setTimeout(() => this.deleteReply(interaction).ignore(), nextUsable);

				return;
			}
		}

		this.log.info(`Handling ${this.#client.diagnostics.interaction(interaction)}...`);

		const start = Date.now();
		await handle(this.#client, interaction)
			.then(() => {
				const end = Date.now();
				const timeTakenMilliseconds = end - start;

				this.log.info(
					`Handled ${this.#client.diagnostics.interaction(interaction)} in ${timeTakenMilliseconds}ms.`,
				);
			})
			.catch((error) =>
				this.log.error(error, `Failed to handle ${this.#client.diagnostics.interaction(interaction)}.`),
			);
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

	#registerMessage(interaction: Logos.Interaction, { messageId }: { messageId: bigint }): void {
		setTimeout(() => this.#unregisterMessage(interaction), constants.INTERACTION_TOKEN_EXPIRY);

		this.#messages.set(interaction.token, messageId);
	}

	#unregisterMessage(interaction: Logos.Interaction): void {
		this.#messages.delete(interaction.token);
	}

	async acknowledge(interaction: Logos.Interaction): Promise<void> {
		if (interaction.type === Discord.InteractionTypes.ApplicationCommand) {
			await this.postponeReply(interaction);
			await this.deleteReply(interaction);
			return;
		}

		await this.#client.bot.helpers
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.DeferredUpdateMessage,
			})
			.catch((error) => this.log.error(error, "Failed to acknowledge interaction."));
	}

	async postponeReply(interaction: Logos.Interaction, { visible = false } = {}): Promise<void> {
		this.#replies.set(interaction.token, { ephemeral: !visible });

		if (interaction.parameters["@repeat"]) {
			const strings = constants.contexts.thinking({
				localise: this.#client.localise,
				locale: interaction.guildLocale,
			});
			const message = await this.#client.bot.helpers
				.sendMessage(interaction.channelId, {
					embeds: [
						{
							description: strings.thinking,
							color: constants.colours.notice,
						},
					],
				})
				.catch((error) => {
					this.log.error(error, "Failed to postpone message reply to repeated interaction.");
					return undefined;
				});
			if (message === undefined) {
				return;
			}

			this.#registerMessage(interaction, { messageId: message.id });
			return;
		}

		await this.#client.bot.helpers
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.DeferredChannelMessageWithSource,
				data: visible ? {} : { flags: Discord.MessageFlags.Ephemeral },
			})
			.catch((error) => this.log.error(error, "Failed to postpone reply to interaction."));
	}

	async reply(
		interaction: Logos.Interaction,
		embedOrData: EmbedOrCallbackData,
		{ visible = false, autoDelete = false }: { visible?: boolean; autoDelete?: boolean } = {},
	): Promise<void> {
		const data = getInteractionCallbackData(embedOrData);

		if (!visible) {
			data.flags = Discord.MessageFlags.Ephemeral;
		}

		this.#replies.set(interaction.token, { ephemeral: !visible });

		if (interaction.parameters["@repeat"]) {
			const message = await this.#client.bot.helpers.sendMessage(interaction.channelId, data).catch((error) => {
				this.log.error(error, "Failed to make message reply to repeated interaction.");
				return undefined;
			});
			if (message === undefined) {
				return;
			}

			this.#registerMessage(interaction, { messageId: message.id });
			return;
		}

		await this.#client.bot.helpers
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.ChannelMessageWithSource,
				data,
			})
			.catch((error) => this.log.error(error, "Failed to reply to interaction."));

		if (autoDelete) {
			this.#autoDeleteReply(interaction);
		}
	}

	async editReply(
		interaction: Logos.Interaction,
		embedOrData: EmbedOrCallbackData,
		{ autoDelete = false }: { autoDelete?: boolean } = {},
	): Promise<void> {
		const data = getInteractionCallbackData(embedOrData);

		if (interaction.parameters["@repeat"]) {
			const messageId = this.#messages.get(interaction.token)!;

			await this.#client.bot.helpers.editMessage(interaction.channelId, messageId, data).catch((error) => {
				this.log.error(error, "Failed to edit message reply made to repeated interaction.");
				return undefined;
			});

			return;
		}

		await this.#client.bot.helpers
			.editOriginalInteractionResponse(interaction.token, data)
			.catch((error) => this.log.error(error, "Failed to edit reply to interaction."));

		if (autoDelete) {
			this.#autoDeleteReply(interaction);
		}
	}

	async deleteReply(interaction: Logos.Interaction): Promise<void> {
		if (interaction.parameters["@repeat"]) {
			const messageId = this.#messages.get(interaction.token)!;

			this.#messages.delete(interaction.token);

			await this.#client.bot.helpers.deleteMessage(interaction.channelId, messageId).catch((error) => {
				this.log.error(error, "Failed to delete message reply made to repeated interaction.");
				return undefined;
			});

			return;
		}

		await this.#client.bot.helpers
			.deleteOriginalInteractionResponse(interaction.token)
			.catch((error) => this.log.error(error, "Failed to delete reply to interaction."));
	}

	async respond(interaction: Logos.Interaction, choices: Discord.ApplicationCommandOptionChoice[]): Promise<void> {
		return this.#client.bot.helpers
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: { choices },
			})
			.catch((error) => this.log.error(error, "Failed to respond to autocomplete interaction."));
	}

	async displayModal(
		interaction: Logos.Interaction,
		data: Omit<Discord.InteractionCallbackData, "flags">,
	): Promise<void> {
		return this.#client.bot.helpers
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.Modal,
				data,
			})
			.catch((error) => this.log.error(error, "Failed to show modal."));
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

	#autoDeleteReply(interaction: Logos.Interaction): void {
		setTimeout(() => this.#client.deleteReply(interaction).ignore(), constants.AUTO_DELETE_MESSAGE_TIMEOUT);
	}

	#resolveIdentifierToMembers({
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

			return member.nick?.toLowerCase().includes(identifierLowercase);
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
		const result = this.#resolveIdentifierToMembers({
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
				const strings = constants.contexts.invalidUser({
					localise: this.#client.localise,
					locale: interaction.locale,
				});
				this.error(interaction, {
					title: strings.title,
					description: strings.description,
				}).ignore();

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
			const strings = constants.contexts.autocompleteUser({
				localise: this.#client.localise,
				locale: interaction.locale,
			});
			await this.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
			return;
		}

		const result = this.#resolveIdentifierToMembers({
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
		if (embedOrData.color !== undefined) {
			return embedOrData;
		}

		embedOrData.color = colour;
	} else if (embedOrData.embeds !== undefined) {
		for (const embed of embedOrData.embeds) {
			if (embed.color !== undefined) {
				continue;
			}

			embed.color = colour;
		}
	}

	return embedOrData;
}

export { InteractionStore };
export type { ReplyVisibility };
