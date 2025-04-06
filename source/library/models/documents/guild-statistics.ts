import type { Locale } from "logos:constants/languages/localisation";

type GameType = "pickMissingWord";

interface GameStatistics {
	totalSessions: number;
	totalScore: number;
	uniquePlayers: number;
}

interface GuildStatisticsDocument {
	createdAt: number;
	statistics: Partial<Record<Locale, Partial<Record<GameType, GameStatistics>>>>;
}

export type { GuildStatisticsDocument, GameStatistics, GameType };
