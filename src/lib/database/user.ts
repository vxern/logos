import { Locale, LocalisationLanguage } from "../../constants/languages";
import { MetadataOrIdentifierData, Model } from "./model";

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

class User extends Model<{ idParts: ["userId"] }> {
	get userId(): string {
		return this._idParts[0]!;
	}

	readonly account: Account;

	scores?: Partial<Record<Locale, GameScores>>;

	constructor({
		createdAt,
		account,
		scores,
		...data
	}: {
		createdAt: number;
		account: Account;
		scores?: Partial<Record<Locale, GameScores>>;
	} & MetadataOrIdentifierData<User>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data ? data["@metadata"] : { "@collection": "Users", "@id": Model.buildPartialId<User>(data) },
		});

		this.account = account;
		this.scores = scores;
	}
}

export { User };
