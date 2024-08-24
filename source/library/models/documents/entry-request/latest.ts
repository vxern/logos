interface EntryRequestFormData {
	reason: string;
	aim: string;
	whereFound: string;
}

interface VoteStatistics {
	for?: string[];
	against?: string[];
}

type VoteVerdict = "accepted" | "rejected";

interface ForcedVerdict {
	userId: string;
	verdict: VoteVerdict;
}

interface EntryRequestDocument {
	createdAt: number;
	requestedRoleId: string;
	formData: EntryRequestFormData;
	isFinalised: boolean;
	forcedVerdict?: ForcedVerdict;
	ticketChannelId?: string;
	votes?: VoteStatistics;
}

export type { EntryRequestDocument, EntryRequestFormData, VoteVerdict, ForcedVerdict };
