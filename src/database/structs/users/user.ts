/** Represents a user account. */
interface Account {
	/** User's Discord ID. */
	id: string;
}

/** Represents a customisable user profile. */
interface Profile {
	/** The selected emoji to display alongside the user's name. */
	emoji?: string;
}

/** Represents a user. */
interface User {
	/** User's account data. */
	account: Account;

	/** User's profile data. */
	profile?: Profile;
}

export type { User };
