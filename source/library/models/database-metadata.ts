import { Client } from "logos/client";
import type { DatabaseMetadataDocument } from "logos/models/documents/database-metadata/latest";
import { type ClientOrDatabaseStore, type CreateModelOptions, Model, getDatabase } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";

type CreateDatabaseMetadataOptions = CreateModelOptions<DatabaseMetadata, DatabaseMetadataDocument, "migrations">;
interface DatabaseMetadata extends DatabaseMetadataDocument {}

class DatabaseMetadata extends Model<{ collection: "DatabaseMetadata"; idParts: [] }> {
	readonly createdAt: number;

	constructor(database: DatabaseStore, { createdAt, migrations, ...data }: CreateDatabaseMetadataOptions) {
		super(database, data, { collection: "DatabaseMetadata" });

		this.createdAt = createdAt ?? Date.now();
		this.migrations = migrations;
	}

	static async get(clientOrDatabase: ClientOrDatabaseStore): Promise<DatabaseMetadata | undefined> {
		if (clientOrDatabase instanceof Client) {
			return clientOrDatabase.database.metadata;
		}

		return clientOrDatabase.withSession(async (session) => {
			return session.get<DatabaseMetadata>(
				Model.buildId<DatabaseMetadata>({}, { collection: "DatabaseMetadata" }),
			);
		});
	}

	static async getOrCreate(
		clientOrDatabase: ClientOrDatabaseStore,
		data: CreateDatabaseMetadataOptions,
	): Promise<DatabaseMetadata> {
		const databaseMetadataDocument = await DatabaseMetadata.get(clientOrDatabase);
		if (databaseMetadataDocument !== undefined) {
			return databaseMetadataDocument;
		}

		const database = getDatabase(clientOrDatabase);

		const ticketDocument = new DatabaseMetadata(database, data);
		await ticketDocument.create(database);

		return ticketDocument;
	}
}

export { DatabaseMetadata };
export type { CreateDatabaseMetadataOptions };
