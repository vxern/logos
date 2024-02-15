import { Locale, LocalisationLanguage } from "../../constants/languages";
import { Model } from "./model";

interface Account {
	/** User's Discord ID. */
	readonly id: string;

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

/** @since v3.42.0 */
interface GameScores {
	pickMissingWord?: {
		totalScore: number;
		sessionCount: number;
	};
}

class User extends Model<{ idParts: [userId: string] }> {
	static readonly collection = "Users";

	get userId(): string {
		return this._idParts[0]!;
	}

	readonly account: Account;

	scores?: Partial<Record<Locale, GameScores>>;

	constructor({
		id,
		createdAt,
		account,
		scores,
	}: { id: string; createdAt: number; account: Account; scores?: Partial<Record<Locale, GameScores>> }) {
		super({ id, createdAt });

		this.account = account;
		this.scores = scores;
	}
}

export { User };
