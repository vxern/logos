import type { Client } from "logos/client";
import { type ClientOrDatabaseStore, type IdentifierData, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";

type TicketType = "standalone" | "inquiry";

interface TicketFormData {
	readonly topic: string;
}

type CreateTicketOptions = {
	createdAt?: number;
	type: TicketType;
	formData: TicketFormData;
	isResolved?: boolean;
} & IdentifierData<Ticket>;

class Ticket extends Model<{ collection: "Tickets"; idParts: ["guildId", "authorId", "channelId"] }> {
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
	readonly formData: TicketFormData;

	isResolved: boolean;

	constructor(database: DatabaseStore, { createdAt, type, formData, isResolved, ...data }: CreateTicketOptions) {
		super(database, data, { collection: "Tickets" });

		this.createdAt = createdAt ?? Date.now();
		this.type = type;
		this.formData = formData;
		this.isResolved = isResolved ?? false;
	}

	static getAll(
		clientOrDatabase: ClientOrDatabaseStore,
		clauses?: { where?: Partial<IdentifierData<Ticket>> },
	): Promise<Ticket[]> {
		return Model.all<Ticket>(clientOrDatabase, {
			collection: "Tickets",
			where: Object.assign(
				{ guildId: undefined, authorId: undefined, channelId: undefined },
				{ ...clauses?.where },
			),
		});
	}

	static async create(client: Client, data: CreateTicketOptions): Promise<Ticket> {
		const ticketDocument = new Ticket(client.database, data);

		await ticketDocument.create(client);

		return ticketDocument;
	}
}

export { Ticket };
export type { CreateTicketOptions, TicketType, TicketFormData };
