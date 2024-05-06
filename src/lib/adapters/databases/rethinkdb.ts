import { Collection } from "logos:constants/database";
import { Environment } from "logos:core/environment";
import { DatabaseAdapter, DocumentConventions, DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
import { IdentifierDataOrMetadata, Model } from "logos/database/model";
import { Logger } from "logos/logger";
import { DatabaseStore } from "logos/stores/database";
import rethinkdb from "rethinkdb-ts";

class RethinkDBAdapter extends DatabaseAdapter {
	readonly #_connectionOptions: rethinkdb.RConnectionOptions;
	#_connection!: rethinkdb.Connection;

	private constructor({
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
		super({ environment, identifier: "RethinkDB" });

		this.#_connectionOptions = { host, port: Number(port), db: database, user: username, password };
	}

	static tryCreate({ environment, log }: { environment: Environment; log: Logger }): RethinkDBAdapter | undefined {
		if (
			environment.rethinkdbHost === undefined ||
			environment.rethinkdbPort === undefined ||
			environment.rethinkdbDatabase === undefined
		) {
			log.error(
				"One or more of `RETHINKDB_HOST`, `RETHINKDB_PORT` or `RETHINKDB_DATABASE` have not been provided.",
			);
			return undefined;
		}

		return new RethinkDBAdapter({
			environment,
			username: environment.rethinkdbUsername,
			password: environment.rethinkdbPassword,
			host: environment.rethinkdbHost,
			port: environment.rethinkdbPort,
			database: environment.rethinkdbDatabase,
		});
	}

	async start(): Promise<void> {
		this.#_connection = await rethinkdb.r.connect(this.#_connectionOptions);
		await this.#_createMissingTables();
	}

	async stop(): Promise<void> {
		await this.#_connection.close();
	}

	conventionsFor({
		document,
		data,
		collection,
	}: {
		document: Model;
		data: IdentifierDataOrMetadata<Model, RethinkDBDocumentMetadata>;
		collection: Collection;
	}): DocumentConventions {
		return new RethinkDBDocumentConventions({ document, data, collection });
	}

	async openSession({
		environment,
		database,
	}: { environment: Environment; database: DatabaseStore }): Promise<RethinkDBDocumentSession> {
		return new RethinkDBDocumentSession({ environment, database, connection: this.#_connection });
	}

	async #_createMissingTables(): Promise<void> {
		const tableList = await rethinkdb.r.tableList().run(this.#_connection);

		const queries: rethinkdb.RDatum<rethinkdb.TableChangeResult>[] = [];
		for (const collection of constants.database.collections) {
			if (tableList.includes(collection)) {
				continue;
			}

			queries.push(rethinkdb.r.tableCreate(collection));
		}

		if (queries.length === 0) {
			return;
		}

		this.log.info(`Creating missing tables (${queries.length} to create). This may take a moment...`);

		await rethinkdb.r.expr(queries).run(this.#_connection);
	}
}

interface RethinkDBDocumentMetadata {
	readonly id: string;
	_isDeleted?: boolean;
}

interface RethinkDBDocument extends RethinkDBDocumentMetadata {
	[key: string]: unknown;
}

class RethinkDBDocumentSession extends DocumentSession {
	readonly #_connection: rethinkdb.Connection;

	constructor({
		environment,
		database,
		connection,
	}: { environment: Environment; database: DatabaseStore; connection: rethinkdb.Connection }) {
		super({ identifier: "RethinkDB", environment, database });

		this.#_connection = connection;
	}

	async load<M extends Model>(id: string): Promise<M | undefined> {
		const [collection, _] = Model.decomposeId(id);
		const rawDocument = await rethinkdb.r
			.get<RethinkDBDocument | null>(rethinkdb.r.table(collection), id)
			.run(this.#_connection);
		if (rawDocument === null) {
			return undefined;
		}

		return RethinkDBDocumentConventions.instantiateModel<M>(this.database, rawDocument);
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		return this.loadManyTabulated(ids, {
			loadMany: (ids, { collection }) =>
				rethinkdb.r
					// @ts-expect-error: The type signature of `getAll()` is invalid; The underlying JS code supports an
					// indefinite number of IDs, so this call is completely fine.
					//
					// https://github.com/rethinkdb/rethinkdb-ts/issues/126
					.getAll<RethinkDBDocument>(rethinkdb.r.table(collection), ...ids)
					.run(this.#_connection),
			instantiateModel: (database, rawDocument) =>
				RethinkDBDocumentConventions.instantiateModel<M>(database, rawDocument),
		});
	}

	async #_alreadyExists(id: string, { collection }: { collection: Collection }): Promise<boolean> {
		return await rethinkdb.r.table(collection).getAll(id).count().eq(1).run(this.#_connection);
	}

	async store<M extends Model>(document: M): Promise<void> {
		const alreadyExists = await this.#_alreadyExists(document.id, { collection: document.collection });

		let query: rethinkdb.RDatum;
		if (!alreadyExists) {
			query = rethinkdb.r.insert(rethinkdb.r.table(document.collection), document);
		} else {
			query = rethinkdb.r.replace(rethinkdb.r.table(document.collection), document);
		}

		await query.run(this.#_connection);
	}

	query<M extends Model>({ collection }: { collection: Collection }): RethinkDBDocumentQuery<M> {
		return new RethinkDBDocumentQuery<M>({ database: this.database, connection: this.#_connection, collection });
	}

	async dispose(): Promise<void> {}
}

class RethinkDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #collection: Collection;

	readonly #_database: DatabaseStore;
	readonly #_connection: rethinkdb.Connection;
	#_query: rethinkdb.RTable<RethinkDBDocument>;

	constructor({
		database,
		connection,
		collection,
	}: { database: DatabaseStore; connection: rethinkdb.Connection; collection: Collection }) {
		super();

		this.#collection = collection;
		this.#_database = database;
		this.#_connection = connection;
		this.#_query = rethinkdb.r.table(this.#collection);
	}

	whereRegex(property: string, pattern: RegExp): RethinkDBDocumentQuery<M> {
		this.#_query = this.#_query.filter((document) => document(property).match(pattern.toString()));
		return this;
	}

	whereEquals(property: string, value: unknown): RethinkDBDocumentQuery<M> {
		this.#_query = this.#_query.filter({ [property]: value });
		return this;
	}

	async execute(): Promise<M[]> {
		const rawDocuments = await this.#_query.run(this.#_connection);
		return rawDocuments.map((rawDocument) =>
			RethinkDBDocumentConventions.instantiateModel<M>(this.#_database, rawDocument),
		);
	}
}

class RethinkDBDocumentConventions extends DocumentConventions<RethinkDBDocumentMetadata> {
	get id(): string {
		return this.document.id;
	}

	get isDeleted(): boolean | undefined {
		return this.document._isDeleted;
	}

	set isDeleted(value: boolean) {
		this.document._isDeleted = value;
	}

	static instantiateModel<M extends Model>(database: DatabaseStore, payload: RethinkDBDocument): M {
		const [collection, _] = Model.getDataFromId(payload.id);
		const ModelClass = DatabaseStore.getModelClassByCollection({ collection: collection });

		return new ModelClass(database, payload) as M;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, RethinkDBDocumentMetadata>): boolean {
		return "id" in data;
	}

	buildMetadata({ id, collection: _ }: { id: string; collection: Collection }): RethinkDBDocumentMetadata {
		return { id };
	}

	/**
	 * @privateRemarks
	 * This method is intentionally empty: The base implementation of this method applies an `id` getter on the managed
	 * model by default, since in most cases the property stored on the model is not `id` verbatim, but rather something
	 * like `_id` or `@id`. In the case of RethinkDB, however, the document ID property *is* `id`, so we ought to omit this
	 * getter assignment.
	 */
	assignAccessorsToModel(): void {}
}

export { RethinkDBAdapter, RethinkDBDocumentSession };
