import { Praise } from './praise.ts';

/** Represents a user account. */
interface Account {
	/** User's Discord ID. */
	id: string;

	/** Data concerning praises given to this user. */
	praises?: {
		/** List of praises this user has received. */
		received: Praise[];

		/** Timestamp of when this user last praised another user. */
		lastSent: Date;
	};
}

/** Represents a customisable user profile. */
interface Profile {
	/** The selected emoji to display alongside the user's name. */
	emoji?: string;
}

/** Represents a user record. */
interface User {
	/** User's account data. */
	account: Account;

	/** User's profile data. */
	profile?: Profile;
}

export type { User };
