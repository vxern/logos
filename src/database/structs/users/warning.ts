import { Reference } from '../document.ts';

/** Represents a warning given to a user. */
interface Warning {
	/** The document reference to the user that gave this warning. */
	author: Reference;

	/** The document reference to the user that this warning was given to. */
	subject: Reference;

	/** The reason for this warning. */
	reason: string;
}

export type { Warning };
