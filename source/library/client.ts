import { timestamp } from "logos:core/formatting";
import type { Environment } from "logos:core/loaders/environment";
import { Collector, InteractionCollector } from "logos/collectors";
import commands from "logos/commands/commands";
import { DiscordConnection } from "logos/connection";
import { Guild } from "logos/database/guild";
import { Model } from "logos/database/model";
import { Diagnostics } from "logos/diagnostics";
import { ActionLock } from "logos/helpers/action-lock";
import { Logger } from "logos/logger";
import type { InteractionRepetitionService } from "logos/services/interaction-repetition";
import type { LavalinkService } from "logos/services/lavalink";
import type { RealtimeUpdateService } from "logos/services/realtime-updates";
import type { StatusService } from "logos/services/status";
import { AdapterStore } from "logos/stores/adapters";
import { CommandStore } from "logos/stores/commands";
import { DatabaseStore } from "logos/stores/database";
import { EventStore } from "logos/stores/events";
import { InteractionStore } from "logos/stores/interactions";
import { JournallingStore } from "logos/stores/journalling";
import { LocalisationStore, type RawLocalisations } from "logos/stores/localisations";
import { ServiceStore } from "logos/stores/services";
import { VolatileStore } from "logos/stores/volatile";

class Client {
	static #client?: Client;

	readonly environment: Environment;
	readonly log: Logger;
	readonly database: DatabaseStore;
	readonly volatile?: VolatileStore;
	readonly diagnostics: Diagnostics;

	readonly #localisations: LocalisationStore;
	readonly #commands: CommandStore;
	readonly #interactions: InteractionStore;
	readonly #services: ServiceStore;
	readonly #events: EventStore;
	readonly #journalling: JournallingStore;
	readonly #adapters: AdapterStore;
	readonly #connection: DiscordConnection;
	readonly #guildReloadLock: ActionLock;
	readonly #guildCreateCollector: Collector<"guildCreate">;
	readonly #guildDeleteCollector: Collector<"guildDelete">;
	readonly #interactionCollector: InteractionCollector;
	readonly #channelDeleteCollector: Collector<"channelDelete">;

	get documents(): DatabaseStore["cache"] {
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

	get withContext(): LocalisationStore["withContext"] {
		return this.#localisations.withContext.bind(this.#localisations);
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

	get resolveInteractionToMember(): InteractionStore["resolveInteractionToMember"] {
		return this.#interactions.resolveInteractionToMember.bind(this.#interactions);
	}

	get autocompleteMembers(): InteractionStore["autocompleteMembers"] {
		return this.#interactions.autocompleteMembers.bind(this.#interactions);
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
		log,
		database,
		bot,
		localisations,
	}: {
		environment: Environment;
		log: Logger;
		database: DatabaseStore;
		bot: Discord.Bot;
		localisations: RawLocalisations;
	}) {
		this.environment = environment;
		this.log = log;
		this.database = database;
		this.volatile = VolatileStore.tryCreate({ environment });
		this.diagnostics = new Diagnostics(this);

		this.#localisations = new LocalisationStore({ environment, localisations });
		this.#commands = CommandStore.create(this, {
			localisations: this.#localisations,
			templates: commands,
		});
		this.#interactions = new InteractionStore(this);
		this.#services = new ServiceStore(this);
		this.#events = new EventStore(this);
		this.#journalling = new JournallingStore(this);
		this.#adapters = new AdapterStore(this);
		this.#connection = new DiscordConnection({ environment, bot, events: this.#events.buildEventHandlers() });

		this.#guildReloadLock = new ActionLock();
		this.#guildCreateCollector = new Collector<"guildCreate">();
		this.#guildDeleteCollector = new Collector<"guildDelete">();
		this.#interactionCollector = new InteractionCollector(this, {
			anyType: true,
			anyCustomId: true,
			isPermanent: true,
		});
		this.#channelDeleteCollector = new Collector<"channelDelete">();
	}

	static async create({
		environment,
		localisations,
	}: {
		environment: Environment;
		localisations: RawLocalisations;
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
				cache: { requestMembers: { enabled: true } },
			},
		});

		const database = await DatabaseStore.create({ environment });

		const client = new Client({ environment, log, database, bot, localisations });

		Client.#client = client;

		return client;
	}

	async #setupCollectors(): Promise<void> {
		this.log.info("Setting up event collectors...");

		this.#guildCreateCollector.onCollect((guild) => this.#setupGuild(guild));
		this.#guildDeleteCollector.onCollect((guildId, _) => this.#teardownGuild({ guildId }));
		this.#interactionCollector.onInteraction(this.receiveInteraction.bind(this));
		this.#channelDeleteCollector.onCollect((channel) => {
			this.entities.channels.delete(channel.id);

			if (channel.guildId !== undefined) {
				this.entities.guilds.get(channel.guildId)?.channels.delete(channel.id);
			}
		});

		await this.registerCollector("guildCreate", this.#guildCreateCollector);
		await this.registerCollector("guildDelete", this.#guildDeleteCollector);
		await this.registerInteractionCollector(this.#interactionCollector);
		await this.registerCollector("channelDelete", this.#channelDeleteCollector);

		this.log.info("Event collectors set up.");
	}

	#teardownCollectors(): void {
		this.log.info("Tearing down event collectors...");

		this.#guildCreateCollector.close();
		this.#guildDeleteCollector.close();
		this.#channelDeleteCollector.close();
		this.#interactionCollector.close();

		this.log.info("Event collectors torn down.");
	}

	async #setupGuild(
		guild: Discord.Guild | Logos.Guild,
		{ isReload = false }: { isReload?: boolean } = {},
	): Promise<void> {
		if (!isReload) {
			// This check prevents the same guild being set up multiple times. This can happen when a shard managing a given
			// guild is closed and another shard is spun up, causing Discord to dispatch the `GUILD_CREATE` event again for
			// a guild that Logos would already have been managing.
			if (this.documents.guilds.has(Model.buildPartialId<Guild>({ guildId: guild.id.toString() }))) {
				return;
			}

			this.log.info(`Setting Logos up on ${this.diagnostics.guild(guild)}...`);

			this.log.info(`Fetching ~${guild.memberCount} members of ${this.diagnostics.guild(guild)}...`);

			const members = await this.bot.gateway
				.requestMembers(guild.id, { limit: 0, query: "", nonce: Date.now().toString() })
				.catch((reason) => {
					this.log.warn(`Failed to fetch members of ${this.diagnostics.guild(guild)}:`, reason);
					return [];
				});
			for (const member of members) {
				this.bot.transformers.member(
					this.bot,
					member as unknown as Discord.DiscordMember,
					guild.id,
					member.user.id,
				);
			}

			this.log.info(`Fetched ~${guild.memberCount} members of ${this.diagnostics.guild(guild)}.`);
		}

		const guildDocument = await Guild.getOrCreate(this, { guildId: guild.id.toString() });

		await this.#services.setupGuildServices(this, { guildId: guild.id, guildDocument });

		this.bot.helpers
			.upsertGuildApplicationCommands(guild.id, this.#commands.getEnabledCommands(guildDocument))
			.catch((reason) => this.log.warn(`Failed to upsert commands on ${this.diagnostics.guild(guild)}:`, reason));
	}

	async #teardownGuild({ guildId }: { guildId: bigint }): Promise<void> {
		await this.#services.stopLocal(this, { guildId });
	}

	async start(): Promise<void> {
		this.log.info("Starting client...");

		await this.volatile?.setup();
		await this.database.setup({ prefetchDocuments: true });
		await this.#services.setup();
		await this.#journalling.setup();
		await this.#setupCollectors();
		await this.#connection.open();
	}

	async stop(): Promise<void> {
		await this.#guildReloadLock.dispose();

		this.volatile?.teardown();
		await this.database.teardown();
		await this.#services.teardown();
		this.#journalling.teardown();
		this.#teardownCollectors();
		await this.#connection.close();
	}

	async reloadGuild(guildId: bigint): Promise<void> {
		await this.#guildReloadLock.doAction(() => this.#handleGuildReload(guildId));
	}

	async #handleGuildReload(guildId: bigint): Promise<void> {
		const guild = this.entities.guilds.get(guildId);
		if (guild === undefined) {
			this.log.warn(`Tried to reload ${this.diagnostics.guild(guildId)}, but it wasn't cached.`);
			return;
		}

		this.log.info(`Reloading ${this.diagnostics.guild(guildId)}...`);

		await this.#teardownGuild({ guildId });
		await this.#setupGuild(guild, { isReload: true });

		this.log.info(`${this.diagnostics.guild(guildId)} has been reloaded.`);
	}

	async receiveInteraction(interaction: Logos.Interaction): Promise<void> {
		// If it's a "none" message interaction, just acknowledge and good to go.
		if (
			interaction.type === Discord.InteractionTypes.MessageComponent &&
			interaction.metadata[0] === constants.components.none
		) {
			this.log.info("Component interaction acknowledged.");
			await this.acknowledge(interaction);
			return;
		}

		if (
			interaction.type !== Discord.InteractionTypes.ApplicationCommand &&
			interaction.type !== Discord.InteractionTypes.ApplicationCommandAutocomplete
		) {
			return;
		}

		this.log.info(`Receiving ${this.diagnostics.interaction(interaction)}...`);

		const handle = this.#commands.getHandler(interaction);
		if (handle === undefined) {
			this.log.warn(
				`Could not retrieve handler for ${this.diagnostics.interaction(
					interaction,
				)}. Is the command registered?`,
			);
			return;
		}

		const executedAt = Date.now();

		if (this.#commands.hasRateLimit(interaction)) {
			const rateLimit = this.#commands.getRateLimit(interaction, { executedAt });
			if (rateLimit !== undefined) {
				const nextUsable = rateLimit.nextAllowedUsageTimestamp - executedAt;

				this.log.warn(
					`User rate-limited on ${this.diagnostics.interaction(interaction)}. Next usable in ${Math.ceil(
						nextUsable / 1000,
					)} seconds.`,
				);

				const strings = constants.contexts.rateLimited({
					localise: this.localise.bind(this),
					locale: interaction.locale,
				});
				await this.warning(interaction, {
					title: strings.title,
					description: `${strings.description.tooManyUses({
						times: constants.defaults.COMMAND_RATE_LIMIT.uses,
					})}\n\n${strings.description.cannotUseUntil({
						relative_timestamp: timestamp(rateLimit.nextAllowedUsageTimestamp, {
							format: "relative",
						}),
					})}`,
				});

				setTimeout(() => this.deleteReply(interaction), nextUsable);

				return;
			}
		}

		try {
			this.log.info(`Handling ${this.diagnostics.interaction(interaction)}...`);
			await handle(this, interaction);
		} catch (exception) {
			this.log.error(exception);
		}
	}
}

export { Client };
