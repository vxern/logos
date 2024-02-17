import { Client } from "../client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "./model";

interface ResourceFormData {
	readonly resource: string;
}

// TODO(vxern): Does this not have a createdAt in the ID?
class Resource extends Model<{ idParts: ["guildId", "authorId"] }> {
	get guildId(): string {
		return this._idParts[0]!;
	}

	get authorId(): string {
		return this._idParts[1]!;
	}

	// TODO(vxern): Rename this to `formData`.
	readonly answers: ResourceFormData;

	isResolved: boolean;

	constructor({
		createdAt,
		answers,
		isResolved,
		...data
	}: { createdAt?: number; answers: ResourceFormData; isResolved?: boolean } & MetadataOrIdentifierData<Resource>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data
					? data["@metadata"]
					: { "@collection": "Resources", "@id": Model.buildPartialId<Resource>(data) },
		});

		this.answers = answers;
		this.isResolved = isResolved ?? false;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabase,
		clauses?: { where?: Partial<IdentifierData<Resource>> },
	): Promise<Resource[]> {
		const result = await Model.all<Resource>(clientOrDatabase, {
			collection: "Resources",
			where: Object.assign({ ...clauses?.where }, { guildId: undefined, authorId: undefined }),
		});

		return result;
	}

	static async create(
		client: Client,
		data: IdentifierData<Resource> & { answers: ResourceFormData },
	): Promise<Resource> {
		const resourceDocument = new Resource(data);

		await resourceDocument.create(client);

		return resourceDocument;
	}
}

export { Resource };
export type { ResourceFormData };
