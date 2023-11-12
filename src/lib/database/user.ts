import { LocalisationLanguage } from "../../constants/languages";

/** Represents a user account. */
interface Account {
	/** User's Discord ID. */
	id: string;

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

/** Represents a customisable user profile. */
interface Profile {
	/** The selected emoji to display alongside the user's name. */
	emoji?: string;
}

/** Represents a user. */
interface User {
	id: string;

	/** User's account data. */
	account: Account;

	/** User's profile data. */
	profile?: Profile;

	/** Unix timestamp of the creation of this user document. */
	createdAt: number;
}

export type { User };
