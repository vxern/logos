import type { DatabaseMetadataDocument } from "logos/models/documents/database-metadata/latest";
import {
	type ClientOrDatabaseStore,
	type CreateModelOptions,
	DatabaseMetadataModel,
	Model,
	getDatabase,
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

	static async get(clientOrDatabase: ClientOrDatabaseStore): Promise<DatabaseMetadata | undefined> {
		return getDatabase(clientOrDatabase).withSession(async (session) => {
			return session.get<DatabaseMetadata>(
				Model.buildId<DatabaseMetadata>({}, { collection: "DatabaseMetadata" }),
			);
		});
	}

	static async create(
		clientOrDatabase: ClientOrDatabaseStore,
		data: CreateDatabaseMetadataOptions,
	): Promise<DatabaseMetadata> {
		const database = getDatabase(clientOrDatabase);
		return database.withSession(async (session) => {
			return session.set(new DatabaseMetadata(database, data));
		});
	}
}

export { DatabaseMetadata };
export type { CreateDatabaseMetadataOptions };