import { DatabaseAdapter, DocumentSession } from "logos/adapters/databases/adapter";
import { DatabaseStore } from "logos/stores/database";
import * as ravendb from "ravendb";

class RavenDBAdapter extends DatabaseAdapter {
	readonly #_store: ravendb.DocumentStore;

	constructor({
		database,
		host,
		port,
		certificate,
	}: { database: string; host: string; port: string; certificate?: Buffer }) {
		super();

		const hostWithPort = `${host}:${port}`;
		if (certificate !== undefined) {
			this.#_store = new ravendb.DocumentStore(hostWithPort, database, { certificate, type: "pfx" });
		} else {
			this.#_store = new ravendb.DocumentStore(hostWithPort, database);
		}
	}

	async start(): Promise<void> {
		this.#_store.initialize();
	}

	async stop(): Promise<void> {
		this.#_store.dispose();
	}

	async openSession({ store }: { store: DatabaseStore }): Promise<RavenDBDocumentSession> {
		const rawSession = this.#_store.openSession();

		return new RavenDBDocumentSession({ store, session: rawSession });
	}
}

class RavenDBDocumentSession extends DocumentSession {
	readonly #_session: ravendb.IDocumentSession;

	constructor({ store, session }: { store: DatabaseStore; session: ravendb.IDocumentSession }) {
		super({ store });

		this.#_session = session;

		// ! This logic needs to be turned off as Logos performs model operations and conversions on its own.
		// ! The following line prevents the RavenDB client from trying to convert raw documents to an entity.
		this.#_session.advanced.entityToJson.convertToEntity = (_, __, document, ____) => document;
	}

	async load(id: string): Promise<object | undefined | null> {
		return this.#_session.load(id);
	}

	async loadMany(ids: string[]): Promise<(object | undefined | null)[]> {
		return this.#_session.load(ids).then((results) => Object.values(results));
	}

	async store(object: object): Promise<void> {
		await this.#_session.store(object);
	}

	async dispose(): Promise<void> {}
}

export { RavenDBAdapter, RavenDBDocumentSession };
