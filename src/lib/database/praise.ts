import { Client } from "../client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "./model";

// TODO(vxern): This needs a guild in the ID as well.
// TODO(vxern): Verify order of ID parts.
// TODO(vxern): Does this not have a createdAt in the ID?
class Praise extends Model<{ idParts: ["authorId", "targetId"] }> {
	get authorId(): string {
		return this.idParts[0]!;
	}

	get targetId(): string {
		return this.idParts[1]!;
	}

	comment?: string;

	constructor({
		createdAt,
		comment,
		...data
	}: { createdAt?: number; comment?: string } & MetadataOrIdentifierData<Praise>) {
		super({
			createdAt,
			"@metadata": Model.buildMetadata(data, { collection: "Praises" }),
		});

		this.comment = comment;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabase,
		clauses?: { where?: Partial<IdentifierData<Praise>> },
	): Promise<Praise[]> {
		const result = await Model.all<Praise>(clientOrDatabase, {
			collection: "Praises",
			where: Object.assign({ ...clauses?.where }, { authorId: undefined, targetId: undefined }),
		});

		return result;
	}

	static async create(client: Client, data: IdentifierData<Praise> & { comment?: string }): Promise<Praise> {
		const praiseDocument = new Praise(data);

		await praiseDocument.create(client);

		return praiseDocument;
	}
}

export { Praise };
