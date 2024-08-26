import type { DatabaseMetadataDocument } from "logos/models/documents/database-metadata/latest";
import {
	type ClientOrDatabaseStore,
	type CreateModelOptions,
	Model,
	getDatabase,
	DatabaseMetadataModel,
} from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";

type CreateDatabaseMetadataOptions = CreateModelOptions<DatabaseMetadata, DatabaseMetadataDocument, "migrations">;

interface DatabaseMetadata extends DatabaseMetadataDocument {}
class DatabaseMetadata extends DatabaseMetadataModel {
	readonly createdAt: number;

	constructor(database: DatabaseStore, { createdAt, migrations, ...data }: CreateDatabaseMetadataOptions) {
		super(database, data, { collection: "DatabaseMetadata" });

		this.createdAt = createdAt ?? Date.now();
		this.migrations = migrations;
	}

	static async getOrCreate(
		clientOrDatabase: ClientOrDatabaseStore,
		data: CreateDatabaseMetadataOptions,
	): Promise<DatabaseMetadata> {
		const database = getDatabase(clientOrDatabase);
		return database.withSession(async (session) => {
			const userDocument = await session.get<DatabaseMetadata>(
				Model.buildId<DatabaseMetadata>(data, { collection: "DatabaseMetadata" }),
			);
			if (userDocument !== undefined) {
				return userDocument;
			}

			return session.set(new DatabaseMetadata(database, data));
		});
	}
}

export { DatabaseMetadata };
export type { CreateDatabaseMetadataOptions };
