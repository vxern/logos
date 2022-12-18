import { Reference } from 'logos/src/database/document.ts';

/** Represents an entry request submitted by the user upon attempting to join the server. */
interface EntryRequest {
	/** The document reference to the submitter of this request. */
	submitter: Reference;

	/** The ID of the guild this request was submitted for. */
	guild: string;

	/** The role the user requested to receive. */
	requestedRole: string;

	/** The answers to the verification questions. */
	answers: Record<string, string | undefined>;

	/** The document references to the moderators who have voted to accept this entry request. */
	votedFor: Reference[];

	/** The document references to the moderators who have voted to reject this entry request. */
	votedAgainst: Reference[];

	/** Whether this entry request has been decided on and  */
	isFinalised: boolean;
}

export type { EntryRequest };
