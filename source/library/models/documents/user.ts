import type { Locale, LocalisationLanguage } from "logos:constants/languages/localisation";
import type { GameType } from "logos/models/documents/guild-statistics";

interface Account {
	/**
	 * User's preferred localisation language.
	 *
	 * @since v3.5.0
	 */
	language?: LocalisationLanguage;

	/** IDs of servers the user's entry request has been accepted on. */
	authorisedOn?: string[];

	/** IDs of servers the user's entry request has been rejected on. */
	rejectedOn?: string[];
}

interface GameScores {
	totalScore: number;
	sessionCount: number;
}

interface UserDocument {
	createdAt: number;
	account?: Account;
	scores?: Partial<Record<Locale, Partial<Record<GameType, GameScores>>>>;
}

export type { UserDocument, GameScores };
