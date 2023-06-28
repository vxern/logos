import { Reference } from "../document.js";

/** Represents a suggestion submitted for one of the guilds. */
interface Suggestion {
	/** Unix timestamp of the creation of this suggestion document. */
	createdAt: number;

	/** The document reference to the author of this suggestion. */
	author: Reference;

	/** The ID of the guild this suggestion was submitted on. */
	guild: string;

	/** The suggestion. */
	suggestion: string;

	/** Whether or not this suggestion has been resolved. */
	isResolved: boolean;
}

export type { Suggestion };
