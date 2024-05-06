import { Collection } from "logos:constants/database";
import { Environment } from "logos:core/environment";
import { DatabaseAdapter, DocumentConventions, DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
import { IdentifierDataOrMetadata, Model } from "logos/database/model";
import { Logger } from "logos/logger";
import { DatabaseStore } from "logos/stores/database";
import nano from "nano";

class CouchDBAdapter extends DatabaseAdapter {
	readonly #_documents: nano.DocumentScope<unknown>;

	private constructor({
		environment,
		username,
		password,
		protocol,
		host,
		port,
		database,
	}: {
		environment: Environment;
		username: string;
		password: string;
		protocol: string;
		host: string;
		port: string;
		database: string;
	}) {
		super({ identifier: "CouchDB", environment });

		let url: string;
		if (username !== undefined) {
			if (password !== undefined) {
				url = `${protocol}://${username}:${password}@${host}:${port}`;
			} else {
				url = `${protocol}://${username}@${host}:${port}`;
			}
		} else {
			url = `${protocol}://${host}:${port}`;
		}

		const server = nano({
			url,
			requestDefaults: { agent: constants.USER_AGENT, headers: { "User-Agent": constants.USER_AGENT } },
		});
		this.#_documents = server.db.use(database);
	}

	static tryCreate({ environment, log }: { environment: Environment; log: Logger }): CouchDBAdapter | undefined {
		if (
			environment.couchdbUsername === undefined ||
			environment.couchdbPassword === undefined ||
			environment.couchdbHost === undefined ||
			environment.couchdbPort === undefined ||
			environment.couchdbDatabase === undefined
		) {
			log.error(
				"One or more of `COUCHDB_USERNAME`, `COUCHDB_PASSWORD`, `COUCHDB_HOST`, `COUCHDB_PORT` or `COUCHDB_DATABASE` have not been provided.",
			);
			return undefined;
		}

		return new CouchDBAdapter({
			environment,
			username: environment.couchdbUsername,
			password: environment.couchdbPassword,
			protocol: environment.couchdbProtocol,
			host: environment.couchdbHost,
			port: environment.couchdbPort,
			database: environment.couchdbDatabase,
		});
	}

	async start(): Promise<void> {}

	async stop(): Promise<void> {}

	conventionsFor({
		document,
		data,
		collection,
	}: {
		document: Model;
		data: IdentifierDataOrMetadata<Model, CouchDBDocumentMetadata>;
		collection: Collection;
	}): DocumentConventions {
		return new CouchDBDocumentConventions({ document, data, collection });
	}

	async openSession({
		environment,
		database,
	}: { environment: Environment; database: DatabaseStore }): Promise<CouchDBDocumentSession> {
		return new CouchDBDocumentSession({ environment, database, documents: this.#_documents });
	}
}

type CouchDBDocumentMetadata = Omit<nano.DocumentGetResponse, "_rev"> & { _rev?: string };

interface CouchDBDocument extends CouchDBDocumentMetadata {
	[key: string]: unknown;
}

class CouchDBDocumentSession extends DocumentSession {
	readonly #_documents: nano.DocumentScope<unknown>;

	constructor({
		environment,
		database,
		documents,
	}: { environment: Environment; database: DatabaseStore; documents: nano.DocumentScope<unknown> }) {
		super({ identifier: "CouchDB", environment, database });

		this.#_documents = documents;
	}

	async load<M extends Model>(id: string): Promise<M | undefined> {
		const rawDocument = await this.#_documents.get(id).catch((error) => {
			if (error.statusCode !== 404) {
				this.log.error(`Failed to get document ${id}: ${error}`);
			}

			return undefined;
		});
		if (rawDocument === undefined) {
			return undefined;
		}

		return CouchDBDocumentConventions.instantiateModel<M>(this.database, rawDocument as CouchDBDocument);
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		if (ids.length === 0) {
			return [];
		}

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

			const row = result as nano.DocumentResponseRow<CouchDBDocument>;
			const rowDocument = row.doc!;

			documents.push(CouchDBDocumentConventions.instantiateModel<M>(this.database, rowDocument));
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

	query<M extends Model>(_: { collection: Collection }): CouchDBDocumentQuery<M> {
		return new CouchDBDocumentQuery<M>({ documents: this.#_documents, session: this });
	}

	async dispose(): Promise<void> {}
}

class CouchDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #_documents: nano.DocumentScope<unknown>;
	readonly #_session: CouchDBDocumentSession;
	readonly #_query: nano.MangoQuery;

	constructor({ documents, session }: { documents: nano.DocumentScope<unknown>; session: CouchDBDocumentSession }) {
		super();

		this.#_documents = documents;
		this.#_session = session;
		this.#_query = { selector: {} };
	}

	whereRegex(property: string, pattern: RegExp): CouchDBDocumentQuery<M> {
		Object.assign(this.#_query.selector, { [property === "id" ? "_id" : property]: { $regex: pattern.toString() } });
		return this;
	}

	whereEquals(property: string, value: unknown): CouchDBDocumentQuery<M> {
		Object.assign(this.#_query.selector, { [property === "id" ? "_id" : property]: { $eq: value } });
		return this;
	}

	async execute(): Promise<M[]> {
		const result = await this.#_documents.find(this.#_query);
		const ids = result.docs.map((document) => document._id);
		return (await this.#_session.loadMany(ids)) as M[];
	}
}

class CouchDBDocumentConventions extends DocumentConventions<CouchDBDocumentMetadata> {
	get id(): string {
		return this.document._id;
	}

	get revision(): string | undefined {
		return this.document._rev;
	}

	set revision(value: string) {
		this.document._rev = value;
	}

	get isDeleted(): boolean | undefined {
		return this.document._deleted;
	}

	set isDeleted(value: boolean) {
		this.document._deleted = value;
	}

	static instantiateModel<M extends Model>(database: DatabaseStore, payload: CouchDBDocument): M {
		const [collection, _] = Model.getDataFromId(payload._id);
		const ModelClass = DatabaseStore.getModelClassByCollection({ collection: collection });

		return new ModelClass(database, payload) as M;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, CouchDBDocumentMetadata>): boolean {
		return "_id" in data;
	}

	buildMetadata({ id, collection: _ }: { id: string; collection: Collection }): CouchDBDocumentMetadata {
		return { _id: id };
	}
}

export { CouchDBAdapter, CouchDBDocumentSession };
