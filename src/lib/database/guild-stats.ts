import { Locale } from "logos:constants/languages";
import { Client } from "logos/client";
import { IdentifierData, MetadataOrIdentifierData, Model } from "logos/database/model";

type GameType =
	/** @since v3.42.0 */
	"pickMissingWord";

interface GameStats {
	totalSessions: number;
	totalScore: number;
	uniquePlayers: number;
}

class GuildStats extends Model<{ idParts: ["guildId"] }> {
	static readonly #_initialStats: GameStats = { totalSessions: 1, totalScore: 0, uniquePlayers: 1 };

	get guildId(): string {
		return this.idParts[0];
	}

	readonly createdAt: number;

	stats?: Partial<Record<Locale, Partial<Record<GameType, GameStats>>>>;

	constructor({
		createdAt,
		stats,
		...data
	}: {
		createdAt?: number;
		stats?: Partial<Record<Locale, Partial<Record<GameType, GameStats>>>>;
	} & MetadataOrIdentifierData<GuildStats>) {
		super({
			"@metadata": Model.buildMetadata(data, { collection: "GuildStats" }),
		});

		this.createdAt = createdAt ?? Date.now();
		this.stats = stats;
	}

	static async getOrCreate(client: Client, data: IdentifierData<GuildStats>): Promise<GuildStats> {
		const partialId = Model.buildPartialId(data);
		if (client.documents.guildStats.has(partialId)) {
			return client.documents.guildStats.get(partialId)!;
		}

		return await client.database.withSession(async (session) => {
			const guildStatsDocument = await session.get<GuildStats>(Model.buildId(data, { collection: "GuildStats" }));
			if (guildStatsDocument !== undefined) {
				return guildStatsDocument;
			}

			const newGuildStatsDocument = new GuildStats(data);

			await session.set(newGuildStatsDocument);
			await session.saveChanges();

			return newGuildStatsDocument;
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
export type { GameStats, GameType };
