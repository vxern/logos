import { User } from './user.ts';

/** Represents a praise given to another user. */
interface Praise {
	/** The user who gave this praise. */
	author: User;

	/** Comment attached to this praise. */
	comment: string;
}

export type { Praise };
