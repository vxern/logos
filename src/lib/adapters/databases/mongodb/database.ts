import { Collection } from "logos:constants/database";
import { Environment } from "logos:core/environment";
import { DatabaseAdapter, DocumentConventions } from "logos/adapters/databases/adapter";
import { MongoDBDocumentConventions } from "logos/adapters/databases/mongodb/conventions";
import { MongoDBDocumentMetadata } from "logos/adapters/databases/mongodb/document";
import { MongoDBDocumentSession } from "logos/adapters/databases/mongodb/session";
import { IdentifierDataOrMetadata, Model } from "logos/database/model";
import { Logger } from "logos/logger";
import { DatabaseStore } from "logos/stores/database";
import mongodb from "mongodb";

class MongoDBAdapter extends DatabaseAdapter {
	readonly #_mongoClient: mongodb.MongoClient;
	readonly #_database: string;

	constructor({
		environment,
		username,
		password,
		host,
		port,
		database,
	}: {
		environment: Environment;
		username?: string;
		password?: string;
		host: string;
		port: string;
		database: string;
	}) {
		super({ environment, identifier: "MongoDB" });

		this.#_mongoClient = new mongodb.MongoClient(`mongodb://${host}:${port}`, {
			auth: {
				username,
				password,
			},
		});
		this.#_database = database;
	}

	static tryCreate({ environment, log }: { environment: Environment; log: Logger }): MongoDBAdapter | undefined {
		if (
			environment.mongodbHost === undefined ||
			environment.mongodbPort === undefined ||
			environment.mongodbDatabase === undefined
		) {
			log.error(
				"One or more of `MONGODB_HOST`, `MONGODB_PORT` or `MONGODB_DATABASE` have not been provided. Logos will run in memory.",
			);
			return undefined;
		}

		return new MongoDBAdapter({
			environment,
			username: environment.mongodbUsername,
			password: environment.mongodbPassword,
			host: environment.mongodbHost,
			port: environment.mongodbPort,
			database: environment.mongodbDatabase,
		});
	}

	async start(): Promise<void> {
		await this.#_mongoClient.connect();
	}

	async stop(): Promise<void> {
		await this.#_mongoClient.close();
	}

	conventionsFor({
		document,
		data,
		collection,
	}: {
		document: Model;
		data: IdentifierDataOrMetadata<Model, MongoDBDocumentMetadata>;
		collection: Collection;
	}): DocumentConventions {
		return new MongoDBDocumentConventions({ document, data, collection });
	}

	async openSession({
		environment,
		database,
	}: { environment: Environment; database: DatabaseStore }): Promise<MongoDBDocumentSession> {
		const mongoDatabase = this.#_mongoClient.db(this.#_database);
		return new MongoDBDocumentSession({ environment, database, mongoDatabase });
	}
}

export { MongoDBAdapter };
