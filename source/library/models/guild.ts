import type { Locale } from "logos:constants/languages/localisation";
import type { Client } from "logos/client";
import type {
	FeatureManagement,
	GameStatistics,
	GameType,
	GuildDocument,
	// biome-ignore lint/nursery/noExportedImports: The re-export of `RateLimit` is okay for now.
	RateLimit,
} from "logos/models/documents/guild";
import { type CreateModelOptions, GuildModel, type IdentifierData, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";

type CreateGuildOptions = CreateModelOptions<Guild, GuildDocument>;

interface Guild extends GuildDocument {}
class Guild extends GuildModel {
	static readonly #initialStatistics: GameStatistics = {
		totalSessions: 1,
		totalScore: 0,
		uniquePlayers: 1,
	};

	readonly createdAt: number;

	get guildId(): string {
		return this.idParts[0];
	}

	constructor(
		database: DatabaseStore,
		{ createdAt, isNative, languages, enabledFeatures, journalling, features, ...data }: CreateGuildOptions,
	) {
		super(database, data, { collection: "Guilds" });

		this.createdAt = createdAt ?? Date.now();
		this.languages = languages ?? {
			localisation: constants.defaults.LOCALISATION_LANGUAGE,
			target: constants.defaults.LEARNING_LANGUAGE,
			feature: constants.defaults.FEATURE_LANGUAGE,
		};
		this.enabledFeatures = enabledFeatures ?? {
			journalling: false,
			notices: false,
			informationNotices: false,
			resourceNotices: false,
			roleNotices: false,
			welcomeNotices: false,
			answers: false,
			corrections: false,
			cefr: false,
			game: false,
			resources: false,
			translate: false,
			word: false,
			wordSigils: false,
			context: false,
			targetOnly: false,
			roleLanguages: false,
			alerts: false,
			policy: false,
			rules: false,
			purging: false,
			slowmode: false,
			timeouts: false,
			warns: false,
			reports: false,
			antiFlood: false,
			verification: false,
			dynamicVoiceChannels: false,
			entry: false,
			roleIndicators: false,
			suggestions: false,
			resourceSubmissions: false,
			tickets: false,
			music: false,
			praises: false,
			profile: false,
		};
		this.journalling = journalling ?? {
			purging: false,
			slowmode: false,
			timeouts: false,
			warns: false,
			reports: false,
			antiFlood: false,
			verification: false,
			suggestions: false,
			resourceSubmissions: false,
			tickets: false,
			praises: false,
		};
		this.features = features ?? {};
		this.isNative = isNative ?? false;
	}

	static async get(client: Client, data: IdentifierData<Guild>): Promise<Guild | undefined> {
		const partialId = Model.buildPartialId(data);
		if (client.documents.guilds.has(partialId)) {
			return client.documents.guilds.get(partialId)!;
		}

		return client.database.withSession((session) => {
			return session.get<Guild>(Model.buildId<Guild>(data, { collection: "Guilds" }));
		});
	}

	static async create(client: Client, data: CreateGuildOptions): Promise<Guild> {
		return client.database.withSession((session) => {
			return session.set(new Guild(client.database, data));
		});
	}

	static async getOrCreate(client: Client, data: CreateGuildOptions): Promise<Guild> {
		const guildDocument = await Guild.get(client, data);
		if (guildDocument !== undefined) {
			return guildDocument;
		}

		return Guild.create(client, data);
	}

	hasEnabled(feature: keyof Guild["enabledFeatures"]): boolean {
		return this.enabledFeatures[feature];
	}

	feature<K extends keyof Guild["features"]>(feature: K): NonNullable<Guild["features"][K]> {
		if (!this.hasEnabled(feature)) {
			throw new Error(
				`Attempted to get guild feature '${feature}' that was not enabled on guild with ID ${this.guildId}.`,
			);
		}

		const configuration = this.features[feature];
		if (configuration === undefined) {
			throw new Error(
				`Guild feature '${feature}' is enabled on guild with ID ${this.guildId}, but missing a configuration.`,
			);
		}

		return configuration;
	}

	isJournalled(feature: keyof Guild["journalling"]): boolean {
		return this.journalling[feature];
	}

	rateLimit(feature: keyof Guild["rateLimits"]): RateLimit | undefined {
		return this.rateLimits[feature];
	}

	managers(feature: keyof Guild["management"]): FeatureManagement | undefined {
		return this.management[feature];
	}

	isTargetLanguageOnlyChannel(channelId: string): boolean {
		if (!this.hasEnabled("targetOnly")) {
			return false;
		}

		return this.feature("targetOnly").channelIds.includes(channelId) ?? false;
	}

	registerSession({
		game,
		learningLocale,
		isUnique,
	}: { game: GameType; learningLocale: Locale; isUnique: boolean }): void {
		if (this.statistics === undefined) {
			this.statistics = { [learningLocale]: { [game]: { ...Guild.#initialStatistics } } };
			return;
		}

		const statisticsForLocale = this.statistics[learningLocale];
		if (statisticsForLocale === undefined) {
			this.statistics[learningLocale] = { [game]: { ...Guild.#initialStatistics } };
			return;
		}

		const statisticsForGame = statisticsForLocale[game];
		if (statisticsForGame === undefined) {
			statisticsForLocale[game] = { ...Guild.#initialStatistics };
			return;
		}

		statisticsForGame.totalSessions += 1;

		if (isUnique) {
			statisticsForGame.uniquePlayers += 1;
		}
	}

	incrementScore({ game, learningLocale }: { game: GameType; learningLocale: Locale }): void {
		// We don't care about incrementing the score if the statistics could not be found, since at that point, we
		// have a bigger problem on our hands: the statistics gone *poof*.
		const statisticsForGame = this.statistics?.[learningLocale]?.[game];
		if (statisticsForGame === undefined) {
			return;
		}

		statisticsForGame.totalScore += 1;
	}
}

export { Guild };
export type { CreateGuildOptions, RateLimit };
