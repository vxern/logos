import type { Client } from "logos/client";
import { type ClientOrDatabaseStore, type IdentifierData, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";
import type { TicketDocument } from "logos/models/documents/ticket/latest";

type CreateTicketOptions = Partial<TicketDocument> & IdentifierData<Ticket>;

interface Ticket extends TicketDocument {}

class Ticket extends Model<{ collection: "Tickets"; idParts: ["guildId", "authorId", "channelId"] }> {
	readonly createdAt: number;

	get guildId(): string {
		return this.idParts[0];
	}

	get authorId(): string {
		return this.idParts[1];
	}

	get channelId(): string {
		return this.idParts[2];
	}

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
