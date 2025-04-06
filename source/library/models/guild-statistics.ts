import type { Locale } from "logos:constants/languages/localisation";
import type { Client } from "logos/client";
import type { GameStatistics, GameType, GuildStatisticsDocument } from "logos/models/documents/guild-statistics";
import { type CreateModelOptions, GuildStatisticsModel, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";

type CreateGuildStatisticsOptions = CreateModelOptions<GuildStatistics, GuildStatisticsDocument>;

interface GuildStatistics extends GuildStatisticsDocument {}
class GuildStatistics extends GuildStatisticsModel {
	static readonly #initialStatistics: GameStatistics = {
		totalSessions: 1,
		totalScore: 0,
		uniquePlayers: 1,
	};

	readonly createdAt: number;

	get guildId(): string {
		return this.idParts[0];
	}

	constructor(database: DatabaseStore, { createdAt, statistics, ...data }: CreateGuildStatisticsOptions) {
		super(database, data, { collection: "GuildStatistics" });

		this.createdAt = createdAt ?? Date.now();
		this.statistics = statistics ?? {};
	}

	static async getOrCreate(client: Client, data: CreateGuildStatisticsOptions): Promise<GuildStatistics> {
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
export type { CreateGuildStatisticsOptions };
