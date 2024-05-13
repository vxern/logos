import { Client } from "logos/client";
import { ClientOrDatabaseStore, IdentifierData, Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

class Praise extends Model<{ collection: "Praises"; idParts: ["guildId", "authorId", "targetId", "createdAt"] }> {
	get guildId(): string {
		return this.idParts[0];
	}

	get authorId(): string {
		return this.idParts[1];
	}

	get targetId(): string {
		return this.idParts[2];
	}

	get createdAt(): number {
		return Number(this.idParts[3]);
	}

	comment?: string;

	constructor(database: DatabaseStore, { comment, ...data }: { comment?: string } & IdentifierData<Praise>) {
		super(database, data, { collection: "Praises" });

		this.comment = comment;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabaseStore,
		clauses?: { where?: Partial<IdentifierData<Praise>> },
	): Promise<Praise[]> {
		return await Model.all<Praise>(clientOrDatabase, {
			collection: "Praises",
			where: Object.assign(
				{ guildId: undefined, authorId: undefined, targetId: undefined, createdAt: undefined },
				{ ...clauses?.where },
			),
		});
	}

	static async create(
		client: Client,
		data: Omit<IdentifierData<Praise>, "createdAt"> & { comment?: string },
	): Promise<Praise> {
		const praiseDocument = new Praise(client.database, { ...data, createdAt: Date.now().toString() });

		await praiseDocument.create(client);

		return praiseDocument;
	}
}

export { Praise };
