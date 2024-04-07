import { Locale } from "logos:constants/languages";
import { getSnowflakeFromIdentifier } from "logos:constants/patterns";
import diagnostics from "logos:core/diagnostics";
import { timestamp, trim } from "logos:core/formatting";
import { Cache } from "logos/cache";
import { Collector, InteractionCollector } from "logos/collectors";
import commands from "logos/commands/commands";
import { DiscordConnection } from "logos/connection";
import { Guild } from "logos/database/guild";
import { GuildStats } from "logos/database/guild-stats";
import { Logger } from "logos/logger";
import { InteractionRepetitionService } from "logos/services/interaction-repetition";
import { LavalinkService } from "logos/services/lavalink";
import { RealtimeUpdateService } from "logos/services/realtime-updates";
import { StatusService } from "logos/services/status";
import { AdapterStore } from "logos/stores/adapters";
import { CommandStore } from "logos/stores/commands";
import { Database } from "logos/stores/database";
import { EventStore } from "logos/stores/events";
import { InteractionStore } from "logos/stores/interactions";
import { JournallingStore } from "logos/stores/journalling";
import { LocalisationStore, RawLocalisations } from "logos/stores/localisations";
import { ServiceStore } from "logos/stores/services";
import { ActionLock } from "./helpers/action-lock";

interface Environment {
	readonly isDebug: boolean;
	readonly discordSecret: string;
	readonly deeplSecret: string;
	readonly rapidApiSecret: string;
	readonly ravendbHost: string;
	readonly ravendbPort: string;
	readonly ravendbDatabase: string;
	readonly ravendbSecure: boolean;
	readonly redisHost?: string;
	readonly redisPort?: string;
	readonly redisPassword?: string;
	readonly lavalinkHost: string;
	readonly lavalinkPort: string;
	readonly lavalinkPassword: string;
}

interface MemberNarrowingOptions {
	readonly includeBots: boolean;
	readonly restrictToSelf: boolean;
	readonly restrictToNonSelf: boolean;
	readonly excludeModerators: boolean;
}

class Client {
	static #client?: Client;

	readonly environment: Environment;
	readonly log: Logger;
	readonly database: Database;
	readonly cache: Cache;

	readonly #localisations: LocalisationStore;
	readonly #commands: CommandStore;
	readonly #interactions: InteractionStore;
	readonly #services: ServiceStore;
	readonly #events: EventStore;
	readonly #journalling: JournallingStore;
	readonly #adapters: AdapterStore;
	readonly #connection: DiscordConnection;

	readonly #_guildReloadLock: ActionLock;
	readonly #_guildCreateCollector: Collector<"guildCreate">;
	readonly #_guildDeleteCollector: Collector<"guildDelete">;
	readonly #_interactionCollector: InteractionCollector;
	readonly #_channelDeleteCollector: Collector<"channelDelete">;

	get documents(): Database["cache"] {
		return this.database.cache;
	}

	get localiseRaw(): LocalisationStore["localiseRaw"] {
		return this.#localisations.localiseRaw.bind(this.#localisations);
	}

	get localise(): LocalisationStore["localise"] {
		return this.#localisations.localise.bind(this.#localisations);
	}

	get localiseCommand(): LocalisationStore["localiseCommand"] {
		return this.#localisations.localiseCommand.bind(this.#localisations);
	}

	get pluralise(): LocalisationStore["pluralise"] {
		return this.#localisations.pluralise.bind(this.#localisations);
	}

	get commands(): CommandStore["commands"] {
		return this.#commands.commands;
	}

	get isShowable(): CommandStore["isShowable"] {
		return this.#commands.isShowable.bind(this.#commands);
	}

	get unsupported(): InteractionStore["unsupported"] {
		return this.#interactions.unsupported.bind(this.#interactions);
	}

	get notice(): InteractionStore["notice"] {
		return this.#interactions.notice.bind(this.#interactions);
	}

	get noticed(): InteractionStore["noticed"] {
		return this.#interactions.noticed.bind(this.#interactions);
	}

	get success(): InteractionStore["success"] {
		return this.#interactions.success.bind(this.#interactions);
	}

	get succeeded(): InteractionStore["succeeded"] {
		return this.#interactions.succeeded.bind(this.#interactions);
	}

	get pushback(): InteractionStore["pushback"] {
		return this.#interactions.pushback.bind(this.#interactions);
	}

	get pushedBack(): InteractionStore["pushedBack"] {
		return this.#interactions.pushedBack.bind(this.#interactions);
	}

	get warning(): InteractionStore["warning"] {
		return this.#interactions.warning.bind(this.#interactions);
	}

	get warned(): InteractionStore["warned"] {
		return this.#interactions.warned.bind(this.#interactions);
	}

	get error(): InteractionStore["error"] {
		return this.#interactions.error.bind(this.#interactions);
	}

	get errored(): InteractionStore["errored"] {
		return this.#interactions.errored.bind(this.#interactions);
	}

	get failure(): InteractionStore["failure"] {
		return this.#interactions.failure.bind(this.#interactions);
	}

	get failed(): InteractionStore["failed"] {
		return this.#interactions.failed.bind(this.#interactions);
	}

	get death(): InteractionStore["death"] {
		return this.#interactions.death.bind(this.#interactions);
	}

	get died(): InteractionStore["died"] {
		return this.#interactions.died.bind(this.#interactions);
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

	get registerCollector(): EventStore["registerCollector"] {
		return this.#events.registerCollector.bind(this.#events);
	}

	get tryLog(): JournallingStore["tryLog"] {
		return this.#journalling.tryLog.bind(this.#journalling);
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

	get registerInteractionCollector(): <Metadata extends string[]>(
		collector: InteractionCollector<Metadata>,
	) => Promise<void> {
		return (collector) => this.#events.registerCollector("interactionCreate", collector);
	}

	get adapters(): AdapterStore {
		return this.#adapters;
	}

	get bot(): DiscordConnection["bot"] {
		return this.#connection.bot;
	}

	get entities(): DiscordConnection["cache"] {
		return this.#connection.cache;
	}

	private constructor({
		environment,
		certificate,
		log,
		bot,
		localisations,
	}: {
		environment: Environment;
		certificate?: Buffer;
		log: Logger;
		bot: Discord.Bot;
		localisations: RawLocalisations;
	}) {
		this.environment = environment;
		this.log = log;
		this.database = new Database(this, { certificate });
		this.cache = new Cache(this);

		this.#localisations = new LocalisationStore(this, { localisations });
		this.#commands = CommandStore.create(this, {
			localisations: this.#localisations,
			templates: commands,
		});
		this.#interactions = new InteractionStore(this);
		this.#services = new ServiceStore(this);
		this.#events = new EventStore(this);
		this.#journalling = new JournallingStore(this);
		this.#adapters = new AdapterStore(this);
		this.#connection = new DiscordConnection(this, { bot, events: this.#events.buildEventHandlers() });

		this.#_guildReloadLock = new ActionLock();
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

		const bot = Discord.createBot({
			token: environment.discordSecret,
			intents:
				Discord.Intents.Guilds |
				Discord.Intents.GuildMembers | // Members joining, leaving, changing.
				Discord.Intents.GuildModeration | // Access to audit log.
				Discord.Intents.GuildVoiceStates |
				Discord.Intents.GuildMessages |
				Discord.Intents.MessageContent,
			events: {},
			gateway: {
				token: environment.discordSecret,
				events: {},
				cache: {
					requestMembers: {
						enabled: true,
						pending: new Discord.Collection(),
					},
				},
			},
		});

		const client = new Client({ environment, certificate, log, bot, localisations });

		Client.#client = client;

		return client;
	}

	async #setupCollectors(): Promise<void> {
		this.log.info("Setting up event collectors...");

		this.#_guildCreateCollector.onCollect(this.#setupGuild.bind(this));
		this.#_guildDeleteCollector.onCollect((guildId, _) => this.#teardownGuild(guildId));
		this.#_interactionCollector.onInteraction(this.handleInteraction.bind(this));
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
		await this.cache.start();
		await this.database.start();
		await this.#services.start();
		await this.#journalling.start();
		await this.#setupCollectors();
		await this.#connection.open();
	}

	async stop(): Promise<void> {
		await this.#_guildReloadLock.dispose();

		this.cache.stop();
		this.database.stop();
		await this.#services.stop();
		this.#journalling.stop();
		this.#teardownCollectors();
		await this.#connection.close();
	}

	async reloadGuild(guildId: bigint): Promise<void> {
		await this.#_guildReloadLock.doAction(() => this.#_handleGuildReload(guildId));
	}

	async #_handleGuildReload(guildId: bigint): Promise<void> {
		const guild = this.#connection.cache.guilds.get(guildId);
		if (guild === undefined) {
			return;
		}

		await this.#teardownGuild(guildId);
		await this.#setupGuild(guild, { isUpdate: true });
	}

	async handleInteraction(interaction: Logos.Interaction): Promise<void> {
		// If it's a "none" message interaction, just acknowledge and good to go.
		if (
			interaction.type === Discord.InteractionTypes.MessageComponent &&
			interaction.metadata[0] === constants.components.none
		) {
			await this.acknowledge(interaction);

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
						)({ times: constants.defaults.COMMAND_RATE_LIMIT.uses }),
						cannotUseUntil: this.localise(
							"interactions.rateLimited.description.cannotUseAgainUntil",
							locale,
						)({ relative_timestamp: nextAllowedUsageTimestampFormatted }),
					},
				};

				setTimeout(
					() => this.deleteReply(interaction),
					rateLimit.nextAllowedUsageTimestamp - executedAt - constants.time.second,
				);

				await this.warning(interaction, {
					title: strings.title,
					description: `${strings.description.tooManyUses}\n\n${strings.description.cannotUseUntil}`,
				});

				return;
			}
		}

		try {
			await handle(this, interaction, interaction);
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

		const seeker = this.#connection.cache.members.get(guildId)?.get(seekerUserId);
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

		const id = getSnowflakeFromIdentifier(identifier);
		if (id !== undefined) {
			const member = this.#connection.cache.members.get(guildId)?.get(BigInt(id));
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
				autocomplete: this.localise("autocomplete.user", locale)(),
			};

			await this.respond(interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);

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

		await this.respond(
			interaction,
			users.map((user) => ({ name: diagnostics.display.user(user, { prettify: true }), value: user.id.toString() })),
		);
	}
}

export { Client, Environment };
