import { Client } from "logos/client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "logos/database/model";

class Praise extends Model<{ idParts: ["guildId", "authorId", "targetId", "createdAt"] }> {
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

	constructor({ comment, ...data }: { comment?: string } & MetadataOrIdentifierData<Praise>) {
		super({
			"@metadata": Model.buildMetadata(data, { collection: "Praises" }),
		});

		this.comment = comment;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabase,
		clauses?: { where?: Partial<IdentifierData<Praise>> },
	): Promise<Praise[]> {
		return await Model.all<Praise>(clientOrDatabase, {
			collection: "Praises",
			where: Object.assign(
				{ ...clauses?.where },
				{ guildId: undefined, authorId: undefined, targetId: undefined, createdAt: undefined },
			),
		});
	}

	static async create(
		client: Client,
		data: Omit<IdentifierData<Praise>, "createdAt"> & { comment?: string },
	): Promise<Praise> {
		const praiseDocument = new Praise({ ...data, createdAt: Date.now().toString() });

		await praiseDocument.create(client);

		return praiseDocument;
	}
}

export { Praise };
