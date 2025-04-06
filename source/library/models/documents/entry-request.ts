interface EntryRequestFormData {
	reason: string;
	aim: string;
	whereFound: string;
}

type VoteVerdict = "accepted" | "rejected";

interface EntryRequestDocument {
	createdAt: number;
	requestedRoleId: string;
	formData: EntryRequestFormData;
	isResolved: boolean;
	forcedVerdict?: {
		userId: string;
		verdict: VoteVerdict;
	};
	ticketChannelId?: string;
	votes?: {
		for?: string[];
		against?: string[];
	};
}

export type { EntryRequestDocument, EntryRequestFormData, VoteVerdict };
