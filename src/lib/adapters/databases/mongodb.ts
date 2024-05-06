import { Collection } from "logos:constants/database";
import { Environment } from "logos:core/environment";
import { DatabaseAdapter, DocumentConventions, DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
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

interface MongoDBDocumentMetadata {
	readonly _id: string;
	_isDeleted?: boolean;
}

interface MongoDBDocument extends MongoDBDocumentMetadata {
	[key: string]: unknown;
}

class MongoDBDocumentSession extends DocumentSession {
	readonly #_mongoDatabase: mongodb.Db;

	constructor({
		environment,
		database,
		mongoDatabase,
	}: { environment: Environment; database: DatabaseStore; mongoDatabase: mongodb.Db }) {
		super({ identifier: "MongoDB", environment, database });

		this.#_mongoDatabase = mongoDatabase;
	}

	async load<M extends Model>(id: string): Promise<M | undefined> {
		const [collection, _] = Model.decomposeId(id);
		const rawDocument = await this.#_mongoDatabase.collection<MongoDBDocument>(collection).findOne({ _id: id });
		if (rawDocument === null) {
			return undefined;
		}

		return MongoDBDocumentConventions.instantiateModel<M>(this.database, rawDocument as MongoDBDocument);
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		return this.loadManyTabulated<M, MongoDBDocument>(ids, {
			loadMany: (ids, { collection }) =>
				this.#_mongoDatabase.collection<MongoDBDocument>(collection).find({ _id: ids }).toArray(),
			instantiateModel: (database, rawDocument) =>
				MongoDBDocumentConventions.instantiateModel<M>(database, rawDocument),
		});
	}

	async store<M extends Model>(document: M): Promise<void> {
		const [collection, _] = Model.decomposeId(document.id);
		await this.#_mongoDatabase
			.collection<MongoDBDocument>(collection)
			.updateOne({ _id: document.id }, { $set: document as unknown as MongoDBDocument }, { upsert: true });
	}

	query<M extends Model>({ collection }: { collection: Collection }): MongoDBDocumentQuery<M> {
		return new MongoDBDocumentQuery<M>({ mongoDatabase: this.#_mongoDatabase, session: this, collection });
	}

	async dispose(): Promise<void> {}
}

class MongoDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #_mongoDatabase: mongodb.Db;
	readonly #_session: MongoDBDocumentSession;
	readonly #_collection: Collection;
	readonly #_filter: mongodb.Filter<MongoDBDocument>;

	constructor({
		mongoDatabase,
		session,
		collection,
	}: {
		mongoDatabase: mongodb.Db;
		session: MongoDBDocumentSession;
		collection: Collection;
	}) {
		super();

		this.#_mongoDatabase = mongoDatabase;
		this.#_session = session;
		this.#_collection = collection;
		this.#_filter = {};
	}

	whereRegex(property: string, pattern: RegExp): MongoDBDocumentQuery<M> {
		Object.assign(this.#_filter, { [property === "id" ? "_id" : property]: { $regex: pattern } });
		return this;
	}

	whereEquals(property: string, value: unknown): MongoDBDocumentQuery<M> {
		Object.assign(this.#_filter, { [property === "id" ? "_id" : property]: { $eq: value } });
		return this;
	}

	async execute(): Promise<M[]> {
		const rawDocuments = await this.#_mongoDatabase
			.collection<MongoDBDocument>(this.#_collection)
			.find(this.#_filter)
			.toArray();
		return rawDocuments.map((rawDocument) =>
			MongoDBDocumentConventions.instantiateModel(this.#_session.database, rawDocument),
		);
	}
}

class MongoDBDocumentConventions extends DocumentConventions<MongoDBDocumentMetadata> {
	get id(): string {
		return this.document._id;
	}

	get isDeleted(): boolean | undefined {
		return this.document._isDeleted;
	}

	set isDeleted(value: boolean) {
		this.document._isDeleted = value;
	}

	static instantiateModel<M extends Model>(database: DatabaseStore, payload: MongoDBDocument): M {
		const [collection, _] = Model.getDataFromId(payload._id);
		const ModelClass = DatabaseStore.getModelClassByCollection({ collection: collection });

		return new ModelClass(database, payload) as M;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, MongoDBDocumentMetadata>): boolean {
		return "_id" in data;
	}

	buildMetadata({ id, collection: _ }: { id: string; collection: Collection }): MongoDBDocumentMetadata {
		return { _id: id };
	}
}

export { MongoDBAdapter, MongoDBDocumentSession };
