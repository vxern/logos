import Fauna from "fauna";

/** Represents an entry request submitted by the user upon attempting to join the server. */
interface EntryRequest {
	/** Unix timestamp of the creation of this entry request document. */
	createdAt: number;

	/** The document reference to the submitter of this request. */
	submitter: Fauna.values.Ref;

	/** The ID of the guild this request was submitted for. */
	guild: string;

	/** The role the user requested to receive. */
	requestedRole: string;

	/** The answers to the verification questions. */
	answers: {
		/** The reason for which the user is learning a language. */
		reason: string;

		/** What the user aims to use the server for. (conversation practice, questions, debating, etc.) */
		aim: string;

		/** Where the user stumbled upon the server. */
		whereFound: string;
	};

	/** The document references to the moderators who have voted to accept this entry request. */
	votedFor: Fauna.values.Ref[];

	/** The document references to the moderators who have voted to reject this entry request. */
	votedAgainst: Fauna.values.Ref[];

	/** Whether this entry request has been decided on and the user has either been accepted or rejected. */
	isFinalised: boolean;
}

export type { EntryRequest };
