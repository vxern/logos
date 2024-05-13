import { Client } from "logos/client";
import { ClientOrDatabaseStore, IdentifierData, Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

interface ResourceFormData {
	readonly resource: string;
}

class Resource extends Model<{ collection: "Resources"; idParts: ["guildId", "authorId", "createdAt"] }> {
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

	constructor(
		database: DatabaseStore,
		{
			formData,
			isResolved,
			...data
		}: { formData: ResourceFormData; isResolved?: boolean } & IdentifierData<Resource>,
	) {
		super(database, data, { collection: "Resources" });

		this.formData = formData;
		this.isResolved = isResolved ?? false;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabaseStore,
		clauses?: { where?: Partial<IdentifierData<Resource>> },
	): Promise<Resource[]> {
		return await Model.all<Resource>(clientOrDatabase, {
			collection: "Resources",
			where: Object.assign(
				{ guildId: undefined, authorId: undefined, createdAt: undefined },
				{ ...clauses?.where },
			),
		});
	}

	static async create(
		client: Client,
		data: Omit<IdentifierData<Resource>, "createdAt"> & { formData: ResourceFormData },
	): Promise<Resource> {
		const resourceDocument = new Resource(client.database, { ...data, createdAt: Date.now().toString() });

		await resourceDocument.create(client);

		return resourceDocument;
	}
}

export { Resource };
export type { ResourceFormData };
