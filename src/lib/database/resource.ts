import { Client } from "../client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "./model";

interface ResourceFormData {
	readonly resource: string;
}

class Resource extends Model<{ idParts: ["guildId", "authorId", "createdAt"] }> {
	get guildId(): string {
		return this.idParts[0];
	}

	get authorId(): string {
		return this.idParts[1];
	}

	get createdAt(): number {
		return Number(this.idParts[2]);
	}

	// TODO(vxern): Rename this to `formData`.
	readonly answers: ResourceFormData;

	isResolved: boolean;

	constructor({
		answers,
		isResolved,
		...data
	}: { answers: ResourceFormData; isResolved?: boolean } & MetadataOrIdentifierData<Resource>) {
		super({
			"@metadata": Model.buildMetadata(data, { collection: "Resources" }),
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
			where: Object.assign({ ...clauses?.where }, { guildId: undefined, authorId: undefined, createdAt: undefined }),
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
