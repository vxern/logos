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
		const rawDocument = await this.#_mongoDatabase.collection(collection).findOne({ _id: id });
		if (rawDocument === null) {
			return undefined;
		}

		return MongoDBModelConventions.instantiateModel<M>(this.database, rawDocument as MongoDBDocument);
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		const response = await this.#_documents
			.fetch({ keys: ids }, { conflicts: false, include_docs: true })
			.catch((error) => {
				this.log.error(`Failed to get ${ids.length} documents: ${error}`);
				return undefined;
			});
		if (response === undefined) {
			return [];
		}

		const documents: (M | undefined)[] = [];
		for (const result of response.rows) {
			if (result.error !== undefined) {
				documents.push(undefined);
				continue;
			}

			const row = result as nano.DocumentResponseRow<MongoDBDocument>;
			const rowDocument = row.doc!;

			documents.push(MongoDBModelConventions.instantiateModel<M>(this.database, rowDocument));
		}

		return documents;
	}

	async store<M extends Model>(document: M): Promise<void> {
		const result = await this.#_documents
			.insert(document as unknown as nano.IdentifiedDocument, { rev: document.revision })
			.catch((error) => {
				// Conflict during insertion. This happens when a document is attempted to be saved twice at the same
				// time.
				if (error.statusCode === 409) {
					this.log.debug(`Encountered conflict when saving document ${document.id}. Ignoring...`);
					return undefined;
				}

				this.log.error(`Failed to store document ${document.id}: ${error}`);
				return undefined;
			});
		if (result === undefined) {
			return;
		}

		if (result.rev !== document.revision) {
			document.revision = result.rev;
		}
	}

	query<M extends Model>(_: { collection: Collection }): MongoDBDocumentQuery<M> {
		return new MongoDBDocumentQuery<M>({ documents: this.#_documents, session: this });
	}

	async dispose(): Promise<void> {}
}

class MongoDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #_documents: nano.DocumentScope<unknown>;
	readonly #_session: MongoDBDocumentSession;
	readonly #_query: nano.MangoQuery;

	constructor({ documents, session }: { documents: nano.DocumentScope<unknown>; session: MongoDBDocumentSession }) {
		super();

		this.#_documents = documents;
		this.#_session = session;
		this.#_query = { selector: {} };
	}

	whereRegex(property: string, pattern: RegExp): MongoDBDocumentQuery<M> {
		Object.assign(this.#_query.selector, { [property === "id" ? "_id" : property]: { $regex: pattern.toString() } });
		return this;
	}

	whereEquals(property: string, value: unknown): MongoDBDocumentQuery<M> {
		Object.assign(this.#_query.selector, { [property === "id" ? "_id" : property]: { $eq: value } });
		return this;
	}

	async execute(): Promise<M[]> {
		const result = await this.#_documents.find(this.#_query);
		const ids = result.docs.map((document) => document._id);
		return (await this.#_session.loadMany(ids)) as M[];
	}
}

class MongoDBModelConventions extends ModelConventions<MongoDBDocumentMetadata> {
	get id(): string {
		return this.model._id;
	}

	get revision(): string | undefined {
		return this.model._rev;
	}

	set revision(value: string) {
		this.model._rev = value;
	}

	get isDeleted(): boolean | undefined {
		return this.model._deleted;
	}

	set isDeleted(value: boolean) {
		this.model._deleted = value;
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
