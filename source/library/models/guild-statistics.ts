import type { Locale } from "logos:constants/languages/localisation.ts";
import type { Client } from "logos/client";
import { type IdentifierData, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";

type GameType =
	/** @since v3.42.0 */
	"pickMissingWord";

interface GameStatistics {
	totalSessions: number;
	totalScore: number;
	uniquePlayers: number;
}

type CreateGuildStatisticsOptions = {
	createdAt?: number;
	statistics?: Partial<Record<Locale, Partial<Record<GameType, GameStatistics>>>>;
} & IdentifierData<GuildStatistics>;

class GuildStatistics extends Model<{ collection: "GuildStatistics"; idParts: ["guildId"] }> {
	static readonly #initialStatistics: GameStatistics = { totalSessions: 1, totalScore: 0, uniquePlayers: 1 };

	get guildId(): string {
		return this.idParts[0];
	}

	readonly createdAt: number;

	statistics?: Partial<Record<Locale, Partial<Record<GameType, GameStatistics>>>>;

	constructor(database: DatabaseStore, { createdAt, statistics, ...data }: CreateGuildStatisticsOptions) {
		super(database, data, { collection: "GuildStatistics" });

		this.createdAt = createdAt ?? Date.now();
		this.statistics = statistics;
	}

	static getOrCreate(client: Client, data: CreateGuildStatisticsOptions): GuildStatistics | Promise<GuildStatistics> {
		const partialId = Model.buildPartialId<GuildStatistics>(data);
		if (client.documents.guildStatistics.has(partialId)) {
			return client.documents.guildStatistics.get(partialId)!;
		}

		return client.database.withSession(async (session) => {
			const document = await session.get<GuildStatistics>(
				Model.buildId<GuildStatistics>(data, { collection: "GuildStatistics" }),
			);
			if (document !== undefined) {
				return document;
			}

			return session.set(new GuildStatistics(client.database, data));
		});
	}

	registerSession({
		game,
		learningLocale,
		isUnique,
	}: { game: GameType; learningLocale: Locale; isUnique: boolean }): void {
		if (this.statistics === undefined) {
			this.statistics = { [learningLocale]: { [game]: { ...GuildStatistics.#initialStatistics } } };
			return;
		}

		const statisticsForLocale = this.statistics[learningLocale];
		if (statisticsForLocale === undefined) {
			this.statistics[learningLocale] = { [game]: { ...GuildStatistics.#initialStatistics } };
			return;
		}

		const statisticsForGame = statisticsForLocale[game];
		if (statisticsForGame === undefined) {
			statisticsForLocale[game] = { ...GuildStatistics.#initialStatistics };
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

export { GuildStatistics };
export type { CreateGuildStatisticsOptions, GameStatistics, GameType };
