import Fauna from "fauna";

/** Represents a report submitted against one or multiple users. */
interface Report {
	/** Unix timestamp of the creation of this report document. */
	createdAt: number;

	/** The document reference to the author of this report. */
	author: Fauna.values.Ref;

	/** The ID of the guild this report was submitted on. */
	guild: string;

	/** The report form answers. */
	answers: {
		/** The document reference to the users this report concerns. */
		users: string;

		/** The reason for this report. */
		reason: string;

		/** Link to message for context. */
		messageLink?: string;
	};

	/** Whether or not this report has been resolved. */
	isResolved: boolean;
}

export type { Report };