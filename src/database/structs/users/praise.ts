/** Represents a praise given to another user. */
interface Praise {
	/** The user who gave this praise. */
	author: string;

	/** Comment attached to this praise. */
	comment: string;
}

export type { Praise };
