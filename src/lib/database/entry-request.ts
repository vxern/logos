import { Client } from "logos/client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "logos/database/model";

interface EntryRequestFormData {
	readonly reason: string;
	readonly aim: string;
	readonly whereFound: string;
}

interface VoteStats {
	for?: string[];
	against?: string[];
}

type VoteType = "for" | "against";
type VoteVerdict = "accepted" | "rejected";

interface ForcedVerdict {
	readonly userId: string;
	readonly verdict: VoteVerdict;
}

class EntryRequest extends Model<{ idParts: ["guildId", "authorId"] }> {
	get guildId(): string {
		return this.idParts[0];
	}

	get authorId(): string {
		return this.idParts[1];
	}

	readonly createdAt: number;
	readonly requestedRoleId: string;
	readonly formData: EntryRequestFormData;

	isFinalised: boolean;
	forcedVerdict?: ForcedVerdict;
	ticketChannelId?: string;
	votes?: VoteStats;

	get votersFor(): string[] {
		return this.votes?.for ?? [];
	}

	get votersAgainst(): string[] {
		return this.votes?.against ?? [];
	}

	constructor({
		createdAt,
		requestedRoleId,
		formData,
		isFinalised,
		forcedVerdict,
		ticketChannelId,
		votes,
		...data
	}: {
		createdAt?: number;
		requestedRoleId: string;
		formData: EntryRequestFormData;
		isFinalised?: boolean;
		forcedVerdict?: ForcedVerdict;
		ticketChannelId?: string;
		votes?: VoteStats;
	} & MetadataOrIdentifierData<EntryRequest>) {
		super({
			"@metadata": Model.buildMetadata(data, { collection: "EntryRequests" }),
		});

		this.createdAt = createdAt ?? Date.now();
		this.requestedRoleId = requestedRoleId;
		this.formData = formData;
		this.isFinalised = isFinalised ?? false;
		this.forcedVerdict = forcedVerdict;
		this.ticketChannelId = ticketChannelId;
		this.votes = votes;
	}

	static async get(client: Client, data: IdentifierData<EntryRequest>): Promise<EntryRequest | undefined> {
		const partialId = Model.buildPartialId(data);
		if (client.documents.entryRequests.has(partialId)) {
			return client.documents.entryRequests.get(partialId)!;
		}

		return await client.database.withSession(async (session) => {
			const entryRequestDocument = await session.get<EntryRequest>(
				Model.buildId(data, { collection: "EntryRequests" }),
			);

			return entryRequestDocument;
		});
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabase,
		clauses?: { where?: Partial<IdentifierData<EntryRequest>> },
	): Promise<EntryRequest[]> {
		return await Model.all<EntryRequest>(clientOrDatabase, {
			collection: "EntryRequests",
			where: Object.assign({ ...clauses?.where }, { guildId: undefined, authorId: undefined }),
		});
	}

	static async create(
		client: Client,
		data: IdentifierData<EntryRequest> & { requestedRoleId: string; formData: EntryRequestFormData },
	): Promise<EntryRequest> {
		const entryRequestDocument = new EntryRequest(data);

		await entryRequestDocument.create(client);

		return entryRequestDocument;
	}

	getUserVote({ userId }: { userId: string }): VoteType | undefined {
		if (this.votes?.for?.includes(userId)) {
			return "for";
		}

		if (this.votes?.against?.includes(userId)) {
			return "against";
		}

		return undefined;
	}

	addVote({ userId, vote }: { userId: string; vote: VoteType }): void {
		const previousVote = this.getUserVote({ userId });
		if (previousVote !== undefined) {
			if (vote === previousVote) {
				return;
			}

			this.removeVote({ userId, vote: previousVote });
		}

		switch (vote) {
			case "for": {
				if (this.votes === undefined) {
					this.votes = { for: [userId] };
				} else if (this.votes.for === undefined) {
					this.votes.for = [userId];
				} else {
					this.votes.for.push(userId);
				}
				break;
			}
			case "against": {
				if (this.votes === undefined) {
					this.votes = { against: [userId] };
				} else if (this.votes.against === undefined) {
					this.votes.against = [userId];
				} else {
					this.votes.against.push(userId);
				}
				break;
			}
		}
	}

	removeVote({ userId, vote }: { userId: string; vote: VoteType }): void {
		switch (vote) {
			case "for": {
				this.votes!.for!.splice(this.votes!.for!.indexOf(userId), 1);
				break;
			}
			case "against": {
				this.votes!.against!.splice(this.votes!.against!.indexOf(userId), 1);
				break;
			}
		}
	}

	getVerdict({
		requiredFor,
		requiredAgainst,
	}: { requiredFor: number; requiredAgainst: number }): VoteVerdict | undefined {
		if (this.forcedVerdict !== undefined) {
			return this.forcedVerdict.verdict;
		}

		if (this.votersFor.length >= requiredFor) {
			return "accepted";
		}

		if (this.votersAgainst.length >= requiredAgainst) {
			return "rejected";
		}

		return undefined;
	}

	forceVerdict(forcedVerdict: ForcedVerdict): void {
		this.forcedVerdict = forcedVerdict;
	}
}

export { EntryRequest };
export type { EntryRequestFormData, VoteType };
