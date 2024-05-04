import { Collection } from "logos:constants/database";
import { DatabaseAdapter, DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
import { Client } from "logos/client";
import { IdentifierDataOrMetadata, Model, ModelConventions } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";
import mongodb from "mongodb";

class MongoDBAdapter extends DatabaseAdapter {
	readonly #_mongoClient: mongodb.MongoClient;
	readonly #_database: string;

	constructor(
		client: Client,
		{
			username,
			password,
			host,
			port,
			database,
		}: { username?: string; password?: string; host: string; port: string; database: string },
	) {
		super(client, { identifier: "MongoDB" });

		this.#_mongoClient = new mongodb.MongoClient(`mongodb://${host}:${port}`, {
			auth: {
				username,
				password,
			},
		});
		this.#_database = database;
	}

	async start(): Promise<void> {
		await this.#_mongoClient.connect();
	}

	async stop(): Promise<void> {
		await this.#_mongoClient.close();
	}

	conventionsFor({
		model,
		data,
		collection,
	}: {
		model: Model;
		data: IdentifierDataOrMetadata<Model, MongoDBDocumentMetadata>;
		collection: Collection;
	}): ModelConventions {
		return new MongoDBModelConventions({ model, data, collection });
	}

	async openSession({ database }: { database: DatabaseStore }): Promise<MongoDBDocumentSession> {
		const mongoDatabase = this.#_mongoClient.db(this.#_database);
		return new MongoDBDocumentSession(this.client, { database, mongoDatabase });
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

	constructor(client: Client, { database, mongoDatabase }: { database: DatabaseStore; mongoDatabase: mongodb.Db }) {
		super(client, { identifier: "MongoDB", database });

		this.#_mongoDatabase = mongoDatabase;
	}

	async load<M extends Model>(id: string): Promise<M | undefined> {
		const [collection, _] = Model.decomposeId(id);
		const rawDocument = await this.#_mongoDatabase.collection<MongoDBDocument>(collection).findOne({ _id: id });
		if (rawDocument === null) {
			return undefined;
		}

		return MongoDBModelConventions.instantiateModel<M>(this.database, rawDocument as MongoDBDocument);
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		return this.loadManyTabulated<M, MongoDBDocument>(ids, {
			loadMany: (ids, { collection }) =>
				this.#_mongoDatabase.collection<MongoDBDocument>(collection).find({ _id: ids }).toArray(),
			instantiateModel: (database, rawDocument) => MongoDBModelConventions.instantiateModel<M>(database, rawDocument),
		});
	}

	async store<M extends Model>(document: M): Promise<void> {
		const [collection, _] = Model.decomposeId(document.id);
		await this.#_mongoDatabase.collection(collection).insertOne(document);
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
			MongoDBModelConventions.instantiateModel(this.#_session.database, rawDocument),
		);
	}
}

class MongoDBModelConventions extends ModelConventions<MongoDBDocumentMetadata> {
	get id(): string {
		return this.model._id;
	}

	get isDeleted(): boolean | undefined {
		return this.model._isDeleted;
	}

	set isDeleted(value: boolean) {
		this.model._isDeleted = value;
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
