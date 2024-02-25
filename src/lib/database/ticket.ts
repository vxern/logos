import { Client } from "../client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "./model";

type TicketType = "standalone" | "inquiry";

interface TicketFormData {
	readonly topic: string;
}

class Ticket extends Model<{ idParts: ["guildId", "authorId", "channelId"] }> {
	get guildId(): string {
		return this.idParts[0];
	}

	get authorId(): string {
		return this.idParts[1];
	}

	get channelId(): string {
		return this.idParts[2];
	}

	readonly createdAt: number;
	readonly type: TicketType;
	// TODO(vxern): Rename this to `formData`.
	readonly answers: TicketFormData;

	isResolved: boolean;

	constructor({
		createdAt,
		type,
		answers,
		isResolved,
		...data
	}: {
		createdAt?: number;
		type: TicketType;
		answers: TicketFormData;
		isResolved?: boolean;
	} & MetadataOrIdentifierData<Ticket>) {
		super({
			"@metadata": Model.buildMetadata(data, { collection: "Tickets" }),
		});

		this.createdAt = createdAt ?? Date.now();
		this.type = type;
		this.answers = answers;
		this.isResolved = isResolved ?? false;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabase,
		clauses?: { where?: Partial<IdentifierData<Ticket>> },
	): Promise<Ticket[]> {
		const result = await Model.all<Ticket>(clientOrDatabase, {
			collection: "Tickets",
			where: Object.assign({ ...clauses?.where }, { guildId: undefined, authorId: undefined, channelId: undefined }),
		});

		return result;
	}

	static async create(
		client: Client,
		data: IdentifierData<Ticket> & { type: TicketType; answers: TicketFormData },
	): Promise<Ticket> {
		const ticketDocument = new Ticket(data);

		await ticketDocument.create(client);

		return ticketDocument;
	}
}

export { Ticket };
export type { TicketType, TicketFormData };
