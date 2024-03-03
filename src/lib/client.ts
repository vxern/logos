import constants from "../constants/constants";
import defaults from "../constants/defaults";
import { Locale } from "../constants/languages";
import time from "../constants/time";
import diagnostics from "../diagnostics";
import { timestamp, trim } from "../formatting";
import { Collector, InteractionCollector } from "./collectors";
import { CommandStore } from "./commands";
import commandTemplates from "./commands/commands";
import { DiscordConnection } from "./connection";
import { Database } from "./database";
import { Guild } from "./database/guild";
import { GuildStats } from "./database/guild-stats";
import { EventStore } from "./events";
import { InteractionStore } from "./interactions";
import { LocalisationBuilder, LocalisationStore, RawLocalisations } from "./localisations";
import { Logger } from "./logger";
import { ServiceStore } from "./services";
import { InteractionRepetitionService } from "./services/interaction-repetition/interaction-repetition";
import { LavalinkService } from "./services/music/lavalink";
import { RealtimeUpdateService } from "./services/realtime-updates/service";
import { StatusService } from "./services/status/service";

interface Environment {
	readonly isDebug: boolean;
	readonly discordSecret: string;
	readonly deeplSecret: string;
	readonly rapidApiSecret: string;
	readonly ravendbHost: string;
	readonly ravendbDatabase: string;
	readonly ravendbSecure: boolean;
	readonly lavalinkHost: string;
	readonly lavalinkPort: string;
	readonly lavalinkPassword: string;
}

interface MemberNarrowingOptions {
	includeBots: boolean;
	restrictToSelf: boolean;
	restrictToNonSelf: boolean;
	excludeModerators: boolean;
}

class Client {
	readonly environment: Environment;
	readonly log: Logger;
	readonly database: Database;
	readonly cache: Cache;

	readonly #connection: DiscordConnection;
	readonly #localisations: LocalisationStore;
	readonly #commands: CommandStore;
	readonly #interactions: InteractionStore;
	readonly #services: ServiceStore;
	readonly #events: EventStore;

	readonly #_guildCreateCollector: Collector<"guildCreate">;
	readonly #_guildDeleteCollector: Collector<"guildDelete">;
	readonly #_interactionCollector: InteractionCollector;
	readonly #_channelDeleteCollector: Collector<"channelDelete">;

	static #client?: Client;

	get documents(): Database["cache"] {
		return this.database.cache;
	}

	get localise(): LocalisationStore["localise"] {
		return this.#localisations.localise.bind(this.#localisations);
	}

	get localiseUnsafe(): (key: string, locale: Locale | undefined) => LocalisationBuilder | undefined {
		return (key, locale) => {
			if (!this.#localisations.has(key)) {
				return undefined;
			}

			return this.#localisations.localise(key, locale);
		};
	}

	get pluralise(): LocalisationStore["pluralise"] {
		return this.#localisations.pluralise.bind(this.#localisations);
	}

	get isShowable(): CommandStore["isShowable"] {
		return this.#commands.isShowable.bind(this.#commands);
	}

	get registerInteraction(): InteractionStore["registerInteraction"] {
		return this.#interactions.registerInteraction.bind(this.#interactions);
	}

	get unregisterInteraction(): InteractionStore["unregisterInteraction"] {
		return this.#interactions.unregisterInteraction.bind(this.#interactions);
	}

	get acknowledge(): InteractionStore["acknowledge"] {
		return this.#interactions.acknowledge.bind(this.#interactions);
	}

	get postponeReply(): InteractionStore["postponeReply"] {
		return this.#interactions.postponeReply.bind(this.#interactions);
	}

	get reply(): InteractionStore["reply"] {
		return this.#interactions.reply.bind(this.#interactions);
	}

	get editReply(): InteractionStore["editReply"] {
		return this.#interactions.editReply.bind(this.#interactions);
	}

	get deleteReply(): InteractionStore["deleteReply"] {
		return this.#interactions.deleteReply.bind(this.#interactions);
	}

	get respond(): InteractionStore["respond"] {
		return this.#interactions.respond.bind(this.#interactions);
	}

	get displayModal(): InteractionStore["displayModal"] {
		return this.#interactions.displayModal.bind(this.#interactions);
	}

	get lavalinkService(): LavalinkService {
		return this.#services.global.lavalink;
	}

	get interactionRepetitionService(): InteractionRepetitionService {
		return this.#services.global.interactionRepetition;
	}

	get realtimeUpdateService(): RealtimeUpdateService {
		return this.#services.global.realtimeUpdates;
	}

	get statusService(): StatusService {
		return this.#services.global.status;
	}

	get getAlertService() {
		return this.#services.getAlertService.bind(this.#services);
	}

	get getDynamicVoiceChannelService() {
		return this.#services.getDynamicVoiceChannelService.bind(this.#services);
	}

	get getEntryService() {
		return this.#services.getEntryService.bind(this.#services);
	}

	get getJournallingService() {
		return this.#services.getJournallingService.bind(this.#services);
	}

	get getMusicService() {
		return this.#services.getMusicService.bind(this.#services);
	}

	get getRoleIndicatorService() {
		return this.#services.getRoleIndicatorService.bind(this.#services);
	}

	get getNoticeService() {
		return this.#services.getNoticeService.bind(this.#services);
	}

	get getPromptService() {
		return this.#services.getPromptService.bind(this.#services);
	}

	get registerCollector(): EventStore["registerCollector"] {
		return this.#events.registerCollector.bind(this.#events);
	}

	get bot(): DiscordConnection["bot"] {
		return this.#connection.bot;
	}

	get entities(): DiscordConnection["cache"] {
		return this.#connection.cache;
	}

	get registerInteractionCollector(): <Metadata extends string[]>(
		collector: InteractionCollector<Metadata>,
	) => Promise<void> {
		// TODO(vxern): Find a way to get rid of ts-ignore?
		// @ts-ignore: This is fine.
		return (collector) => this.#events.registerCollector("interactionCreate", collector);
	}

	private constructor({
		environment,
		log,
		bot,
		database,
		localisations,
	}: {
		environment: Environment;
		log: Logger;
		bot: Discord.Bot;
		database: Database;
		localisations: RawLocalisations;
	}) {
		const isDebug = environment.isDebug;

		this.environment = environment;
		this.log = log;
		this.database = database;
		this.cache = new Cache();

		this.#localisations = new LocalisationStore({ localisations, isDebug });
		this.#commands = CommandStore.create({
			client: this,
			localisations: this.#localisations,
			templates: Array.from(Object.values(commandTemplates)),
			isDebug,
		});
		this.#interactions = new InteractionStore({ bot, isDebug });
		this.#services = new ServiceStore({ client: this, isDebug });
		this.#events = new EventStore({ services: this.#services, isDebug });
		this.#connection = new DiscordConnection({ bot, events: this.#events.buildEventHandlers(), isDebug });

		this.#_guildCreateCollector = new Collector<"guildCreate">();
		this.#_guildDeleteCollector = new Collector<"guildDelete">();
		this.#_interactionCollector = new InteractionCollector(this, {
			anyType: true,
			anyCustomId: true,
			isPermanent: true,
		});
		this.#_channelDeleteCollector = new Collector<"channelDelete">();
	}

	static async create({
		environment,
		localisations,
		certificate,
	}: {
		environment: Environment;
		localisations: RawLocalisations;
		certificate?: Buffer;
	}): Promise<Client> {
		if (Client.#client !== undefined) {
			return Client.#client;
		}

		const log = Logger.create({ identifier: "Client", isDebug: environment.isDebug });

		log.info("Bootstrapping the client...");

		const database = await Database.create({
			host: environment.ravendbHost,
			database: environment.ravendbDatabase,
			certificate,
		});

		const bot = Discord.createBot({
			token: environment.discordSecret,
			intents:
				Discord.Intents.Guilds |
				Discord.Intents.GuildMembers | // Members joining, leaving, changing.
				Discord.Intents.GuildModeration | // Access to audit log.
				Discord.Intents.GuildVoiceStates |
				Discord.Intents.GuildMessages |
				Discord.Intents.MessageContent,
			// TODO(vxern): Unnecessary.
			events: {},
			gateway: {
				// TODO(vxern): This is unnecessary since it can just be inferred from the top token
				token: environment.discordSecret,
				events: {},
				cache: {
					requestMembers: {
						enabled: true,
						// TODO(vxern): Again, unnecessary.
						pending: new Discord.Collection(),
					},
				},
			},
		});

		return new Client({ environment, log, bot, database, localisations });
	}

	async #setupCollectors(): Promise<void> {
		this.log.info("Setting up event collectors...");

		this.#_guildCreateCollector.onCollect(this.#setupGuild.bind(this));
		this.#_guildDeleteCollector.onCollect((guildId, _) => this.#teardownGuild(guildId));
		this.#_interactionCollector.onCollect(this.handleInteraction.bind(this));
		this.#_channelDeleteCollector.onCollect((channel) => {
			this.#connection.cache.channels.delete(channel.id);

			if (channel.guildId !== undefined) {
				this.#connection.cache.guilds.get(channel.guildId)?.channels.delete(channel.id);
			}
		});

		await this.registerCollector("guildCreate", this.#_guildCreateCollector);
		await this.registerCollector("guildDelete", this.#_guildDeleteCollector);
		await this.registerInteractionCollector(this.#_interactionCollector);
		await this.registerCollector("channelDelete", this.#_channelDeleteCollector);
	}

	#teardownCollectors(): void {
		this.log.info("Tearing down event collectors...");

		this.#_guildCreateCollector.close();
		this.#_guildDeleteCollector.close();
		this.#_channelDeleteCollector.close();
		this.#_interactionCollector.close();
	}

	async #setupGuild(
		guild: Discord.Guild | Logos.Guild,
		options: { isUpdate: boolean } = { isUpdate: false },
	): Promise<void> {
		if (!options.isUpdate) {
			this.log.info(`Logos added to "${guild.name}" (ID ${guild.id}).`);
		}

		const guildDocument = await Guild.getOrCreate(this, { guildId: guild.id.toString() });

		await GuildStats.getOrCreate(this, { guildId: guild.id.toString() });

		await this.#services.startLocal(this, { guildId: guild.id, guildDocument });

		this.bot.rest
			.upsertGuildApplicationCommands(guild.id, this.#commands.getEnabledCommands(guildDocument))
			.catch((reason) => this.log.warn(`Failed to upsert commands on ${diagnostics.display.guild(guild)}:`, reason));

		if (!options.isUpdate) {
			this.log.info(`Fetching ~${guild.memberCount} members of ${diagnostics.display.guild(guild)}...`);

			const members = await this.bot.gateway
				.requestMembers(guild.id, { limit: 0, query: "", nonce: Date.now().toString() })
				.catch((reason) => {
					this.log.warn(`Failed to fetch members of ${diagnostics.display.guild(guild)}:`, reason);
					return [];
				});
			for (const member of members) {
				this.bot.transformers.member(this.bot, member as unknown as Discord.DiscordMember, guild.id, member.user.id);
			}

			this.log.info(`Fetched ~${guild.memberCount} members of ${diagnostics.display.guild(guild)}.`);
		}
	}

	async #teardownGuild(guildId: bigint): Promise<void> {
		await this.#services.stopLocal(guildId);
	}

	async start(): Promise<void> {
		await this.#services.start();
		await this.#setupCollectors();
		await this.#connection.open();
	}

	async stop(): Promise<void> {
		await this.#services.stop();
		this.#teardownCollectors();
		await this.#connection.close();
	}

	// TODO(vxern): Add some kind of locking mechanism.
	async reloadGuild(guildId: bigint): Promise<void> {
		const guild = this.#connection.cache.guilds.get(guildId);
		if (guild === undefined) {
			return;
		}

		await this.#teardownGuild(guildId);
		await this.#setupGuild(guild, { isUpdate: true });
	}

	async handleInteraction(interaction: Logos.Interaction): Promise<void> {
		// If it's a "none" interaction, just acknowledge and good to go.
		if (interaction.metadata[0] === constants.components.none) {
			this.acknowledge(interaction);
			return;
		}

		const handle = this.#commands.getHandler(interaction);
		if (handle === undefined) {
			return;
		}

		const executedAt = Date.now();

		if (this.#commands.hasRateLimit(interaction)) {
			const rateLimit = this.#commands.getRateLimit(interaction, { executedAt });
			if (rateLimit !== undefined) {
				const nextAllowedUsageTimestampFormatted = timestamp(rateLimit.nextAllowedUsageTimestamp, {
					format: "relative",
				});

				const locale = interaction.locale;

				const strings = {
					title: this.localise("interactions.rateLimited.title", locale)(),
					description: {
						tooManyUses: this.localise(
							"interactions.rateLimited.description.tooManyUses",
							locale,
						)({ times: defaults.COMMAND_RATE_LIMIT.uses }),
						cannotUseUntil: this.localise(
							"interactions.rateLimited.description.cannotUseAgainUntil",
							locale,
						)({ relative_timestamp: nextAllowedUsageTimestampFormatted }),
					},
				};

				setTimeout(() => this.deleteReply(interaction), rateLimit.nextAllowedUsageTimestamp - executedAt - time.second);

				this.reply(interaction, {
					embeds: [
						{
							title: strings.title,
							description: `${strings.description.tooManyUses}\n\n${strings.description.cannotUseUntil}`,
							color: constants.colors.dullYellow,
						},
					],
				});

				return;
			}
		}

		try {
			await handle(this, interaction);
		} catch (exception) {
			this.log.error(exception);
		}
	}

	resolveIdentifierToMembers({
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

		const seeker = this.#connection.cache.members.get(Discord.snowflakeToBigint(`${seekerUserId}${guildId}`));
		if (seeker === undefined) {
			return undefined;
		}

		const guild = this.#connection.cache.guilds.get(guildId);
		if (guild === undefined) {
			return undefined;
		}

		const moderatorRoleIds = guild.roles
			.array()
			.filter((role) => role.permissions.has("MODERATE_MEMBERS"))
			.map((role) => role.id);

		const id = extractIDFromIdentifier(identifier);
		if (id !== undefined) {
			const member = this.#connection.cache.members.get(Discord.snowflakeToBigint(`${id}${guildId}`));
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
		{ locale }: { locale: Locale },
	): Logos.Member | undefined {
		const guildId = interaction.guildId;
		if (guildId === undefined) {
			return undefined;
		}

		const result = this.resolveIdentifierToMembers({ guildId, seekerUserId: interaction.user.id, identifier, options });
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
				const strings = {
					title: this.localise("interactions.invalidUser.title", locale)(),
					description: this.localise("interactions.invalidUser.description", locale)(),
				};

				this.reply(interaction, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.red,
						},
					],
				});
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
				autocomplete: this.localise("autocomplete.user", locale)(),
			};

			this.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
			return;
		}

		const guildId = interaction.guildId;
		if (guildId === undefined) {
			return undefined;
		}

		const result = this.resolveIdentifierToMembers({
			guildId,
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

		this.respond(
			interaction,
			users.map((user) => ({ name: diagnostics.display.user(user, { prettify: true }), value: user.id.toString() })),
		);
	}
}

function isValidSnowflake(snowflake: string): boolean {
	return constants.patterns.discord.snowflake.test(snowflake);
}

function extractIDFromIdentifier(identifier: string): string | undefined {
	return (
		constants.patterns.discord.snowflake.exec(identifier)?.at(1) ??
		constants.patterns.discord.userMention.exec(identifier)?.at(1) ??
		constants.patterns.userDisplay.exec(identifier)?.at(1)
	);
}

function isValidIdentifier(identifier: string): boolean {
	return (
		constants.patterns.discord.snowflake.test(identifier) ||
		constants.patterns.discord.userMention.test(identifier) ||
		constants.patterns.userDisplay.test(identifier) ||
		constants.patterns.discord.userHandle.new.test(identifier) ||
		constants.patterns.discord.userHandle.old.test(identifier)
	);
}

export { Client, InteractionCollector, isValidIdentifier, isValidSnowflake, ServiceStore };
