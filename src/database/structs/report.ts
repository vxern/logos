import { Reference } from 'logos/src/database/document.ts';

/** Represents a report submitted against a user. */
interface Report {
	/** The document reference to the author of this report. */
	author: Reference;

	/** The ID of the guild this report was submitted on. */
	guild: string;

	/** The document reference to the users this report concerns. */
	recipients: Reference[];

	/** Optional: Link to a particular message. */
	messageLink?: string;

	/** Whether or not this report has been resolved. */
	isResolved: boolean;
}

export type { Report };
