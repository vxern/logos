import { Article } from '../articles/article.ts';
import { Praise } from './praise.ts';

/** Represents a user account. */
interface Account {
	/** User's Discord ID. */
	id: string;

	/** Data pertaining to articles. */
	articles?: {
		/** Articles submitted by this user. */
		submissions?: Article[];

		/** Timestamps of article updates made by this user. */
		updatesTimestamps?: number[];
	};

	/** Data pertaining to praises. */
	praises?: {
		/** List of praises this user has received. */
		received?: Praise[];

		/** Timestamp of when this user last praised another user. */
		lastSent?: number;
	};
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
