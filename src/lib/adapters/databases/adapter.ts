import { Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

abstract class DatabaseAdapter {
	abstract start(): Promise<void>;
	abstract stop(): Promise<void>;

	/**
	 * @deprecated
	 * Do not use as this does not auto-dispose the session. Use {@link Database.withSession} instead.
	 *
	 * @privateRemarks
	 * This method was reconstructed from the original implementation of the RavenDB `DocumentStore.openSession()`.
	 */
	abstract openSession({ store }: { store: DatabaseStore }): Promise<DocumentSession>;

	async withSession<T>(
		callback: (session: DocumentSession) => Promise<T>,
		{ store }: { store: DatabaseStore },
	): Promise<T> {
		const session = await this.openSession({ store });

		const result = await callback(session);

		await session.dispose();

		return result;
	}
}

abstract class DocumentSession {
	readonly #_store: DatabaseStore;

	constructor({ store }: { store: DatabaseStore }) {
		this.#_store = store;
	}

	abstract load(id: string): Promise<object | undefined | null>;
	async get<M extends Model>(id: string): Promise<M | undefined> {
		const result = await this.load(id);
		if (result == null) {
			return undefined;
		}

		const document = DatabaseStore.instantiateModel(result) as M;
		this.#_store.cacheDocument(document);

		return document;
	}

	abstract loadMany(ids: string[]): Promise<(object | undefined | null)[]>;
	async getMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		const results = await this.loadMany(ids);

		const documents: (M | undefined)[] = [];
		for (const result of Object.values(results)) {
			if (result == null) {
				documents.push(undefined);
				continue;
			}

			const document = DatabaseStore.instantiateModel(result) as M;
			this.#_store.cacheDocument(document);
			documents.push(document);
		}

		return documents;
	}

	abstract store(object: object): Promise<void>;
	async set<M extends Model>(document: M): Promise<M> {
		await this.store(document);
		this.#_store.cacheDocument(document);

		return document;
	}

	async remove<M extends Model>(document: M): Promise<void> {
		// We don't call `delete()` here because we don't actually delete from the database.

		this.#_store.unloadDocument(document);
	}

	abstract dispose(): Promise<void>;
}

export { DatabaseAdapter, DocumentSession };
