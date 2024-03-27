import { Client } from "logos/client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "logos/database/model";

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

	readonly formData: ResourceFormData;

	isResolved: boolean;

	constructor({
		answers,
		isResolved,
		...data
	}: { answers: ResourceFormData; isResolved?: boolean } & MetadataOrIdentifierData<Resource>) {
		super({
			"@metadata": Model.buildMetadata(data, { collection: "Resources" }),
		});

		this.formData = answers;
		this.isResolved = isResolved ?? false;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabase,
		clauses?: { where?: Partial<IdentifierData<Resource>> },
	): Promise<Resource[]> {
		return await Model.all<Resource>(clientOrDatabase, {
			collection: "Resources",
			where: Object.assign({ ...clauses?.where }, { guildId: undefined, authorId: undefined, createdAt: undefined }),
		});
	}

	static async create(
		client: Client,
		data: Omit<IdentifierData<Resource>, "createdAt"> & { answers: ResourceFormData },
	): Promise<Resource> {
		const resourceDocument = new Resource({ ...data, createdAt: Date.now().toString() });

		await resourceDocument.create(client);

		return resourceDocument;
	}
}

export { Resource };
export type { ResourceFormData };
