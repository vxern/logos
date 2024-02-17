import { Client } from "../client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "./model";

interface EntryRequestFormData {
	readonly reason: string;
	readonly aim: string;
	readonly whereFound: string;
}

type VoteType = "for" | "against";

class EntryRequest extends Model<{ idParts: ["guildId", "authorId"] }> {
	get guildId(): string {
		return this._idParts[0]!;
	}

	get authorId(): string {
		return this._idParts[1]!;
	}

	readonly requestedRoleId: string;
	// TODO(vxern): Rename to "formData".
	readonly answers: EntryRequestFormData;

	isFinalised: boolean;
	ticketChannelId?: string;
	// TODO(vxern): Store as an object "votes".
	votedFor?: string[];
	votedAgainst?: string[];

	constructor({
		createdAt,
		requestedRoleId,
		answers,
		isFinalised,
		ticketChannelId,
		votedFor,
		votedAgainst,
		...data
	}: {
		createdAt?: number;
		requestedRoleId: string;
		answers: EntryRequestFormData;
		isFinalised?: boolean;
		ticketChannelId?: string;
		votedFor?: string[];
		votedAgainst?: string[];
	} & MetadataOrIdentifierData<EntryRequest>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data
					? data["@metadata"]
					: { "@collection": "EntryRequests", "@id": Model.buildPartialId<EntryRequest>(data) },
		});

		this.requestedRoleId = requestedRoleId;
		this.answers = answers;

		this.isFinalised = isFinalised ?? false;
		this.ticketChannelId = ticketChannelId;
		this.votedFor = votedFor;
		this.votedAgainst = votedAgainst;
	}

	static async get(client: Client, data: IdentifierData<EntryRequest>): Promise<EntryRequest | undefined> {
		const partialId = Model.buildPartialId(data);
		if (client.documents.entryRequests.has(partialId)) {
			return client.documents.entryRequests.get(partialId)!;
		}

		const { promise, resolve } = Promise.withResolvers<EntryRequest | undefined>();

		await client.database.withSession(async (session) => {
			const entryRequestDocument = await session.get<EntryRequest>(
				Model.buildId(data, { collection: "EntryRequests" }),
			);

			resolve(entryRequestDocument);
		});

		return promise;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabase,
		clauses?: { where?: Partial<IdentifierData<EntryRequest>> },
	): Promise<EntryRequest[]> {
		const result = await Model.all<EntryRequest>(clientOrDatabase, {
			collection: "EntryRequests",
			where: Object.assign({ ...clauses?.where }, { guildId: undefined, authorId: undefined }),
		});

		return result;
	}

	static async create(
		client: Client,
		data: IdentifierData<EntryRequest> & { requestedRoleId: string; answers: EntryRequestFormData },
	): Promise<EntryRequest> {
		const entryRequestDocument = new EntryRequest(data);

		await entryRequestDocument.create(client);

		return entryRequestDocument;
	}

	getUserVote({ userId }: { userId: string }): VoteType | undefined {
		if (this.votedFor?.includes(userId)) {
			return "for";
		}

		if (this.votedAgainst?.includes(userId)) {
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
				if (this.votedFor === undefined) {
					this.votedFor = [userId];
					return;
				}

				this.votedFor!.splice(this.votedFor!.indexOf(userId), 1);
				break;
			}
			case "against": {
				if (this.votedAgainst === undefined) {
					this.votedAgainst = [userId];
					return;
				}

				this.votedAgainst!.splice(this.votedAgainst!.indexOf(userId), 1);
				break;
			}
		}
	}

	removeVote({ userId, vote }: { userId: string; vote: VoteType }): void {
		switch (vote) {
			case "for": {
				this.votedFor!.splice(this.votedFor!.indexOf(userId), 1);
				break;
			}
			case "against": {
				this.votedAgainst!.splice(this.votedAgainst!.indexOf(userId), 1);
				break;
			}
		}
	}
}

export { EntryRequest };
export type { EntryRequestFormData, VoteType };
