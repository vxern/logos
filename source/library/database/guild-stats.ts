import type { Locale } from "logos:constants/languages";
import type { Client } from "logos/client";
import { type IdentifierData, Model } from "logos/database/model";
import type { DatabaseStore } from "logos/stores/database";

type GameType =
	/** @since v3.42.0 */
	"pickMissingWord";

interface GameStats {
	totalSessions: number;
	totalScore: number;
	uniquePlayers: number;
}

type CreateGuildStatsOptions = {
	createdAt?: number;
	stats?: Partial<Record<Locale, Partial<Record<GameType, GameStats>>>>;
} & IdentifierData<GuildStats>;

// TODO(vxern): This needs renaming to "GuildStatistics" at some point.
class GuildStats extends Model<{ collection: "GuildStats"; idParts: ["guildId"] }> {
	static readonly #_initialStats: GameStats = { totalSessions: 1, totalScore: 0, uniquePlayers: 1 };

	get guildId(): string {
		return this.idParts[0];
	}

	readonly createdAt: number;

	stats?: Partial<Record<Locale, Partial<Record<GameType, GameStats>>>>;

	constructor(database: DatabaseStore, { createdAt, stats, ...data }: CreateGuildStatsOptions) {
		super(database, data, { collection: "GuildStats" });

		this.createdAt = createdAt ?? Date.now();
		this.stats = stats;
	}

	static getOrCreate(client: Client, data: CreateGuildStatsOptions): GuildStats | Promise<GuildStats> {
		const partialId = Model.buildPartialId<GuildStats>(data);
		if (client.documents.guildStats.has(partialId)) {
			return client.documents.guildStats.get(partialId)!;
		}

		return client.database.withSession(async (session) => {
			const guildStatsDocument = await session.get<GuildStats>(
				Model.buildId<GuildStats>(data, { collection: "GuildStats" }),
			);
			if (guildStatsDocument !== undefined) {
				return guildStatsDocument;
			}

			return session.set(new GuildStats(client.database, data));
		});
	}

	registerSession({
		game,
		learningLocale,
		isUnique,
	}: { game: GameType; learningLocale: Locale; isUnique: boolean }): void {
		if (this.stats === undefined) {
			this.stats = { [learningLocale]: { [game]: { ...GuildStats.#_initialStats } } };
			return;
		}

		const statsForLocale = this.stats[learningLocale];
		if (statsForLocale === undefined) {
			this.stats[learningLocale] = { [game]: { ...GuildStats.#_initialStats } };
			return;
		}

		const statsForGame = statsForLocale[game];
		if (statsForGame === undefined) {
			statsForLocale[game] = { ...GuildStats.#_initialStats };
			return;
		}

		statsForGame.totalSessions += 1;

		if (isUnique) {
			statsForGame.uniquePlayers += 1;
		}
	}

	incrementScore({ game, learningLocale }: { game: GameType; learningLocale: Locale }): void {
		// * We don't care about incrementing the score if the stats could not be found.
		// * At that point, we have a bigger problem to think about - the stats being gone.
		const statsForGame = this.stats?.[learningLocale]?.[game];
		if (statsForGame === undefined) {
			return;
		}

		statsForGame.totalScore += 1;
	}
}

export { GuildStats };
export type { CreateGuildStatsOptions, GameStats, GameType };
