import { Collection } from "logos:constants/database";
import { Model, ModelConventions } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

abstract class DatabaseAdapter {
	abstract start(): Promise<void>;

	abstract stop(): Promise<void>;

	abstract conventionsFor({ model }: { model: Model }): ModelConventions;

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

	abstract load<M extends Model>(id: string): Promise<M | undefined>;
	async get<M extends Model>(id: string): Promise<M | undefined> {
		const document = await this.load<M>(id);
		if (document === undefined) {
			return undefined;
		}

		this.#_store.cacheDocument(document);

		return document;
	}

	abstract loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]>;
	async getMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		const results = await this.loadMany<M>(ids);

		const documents: (M | undefined)[] = [];
		for (const document of Object.values(results)) {
			if (document === undefined) {
				documents.push(undefined);
				continue;
			}

			this.#_store.cacheDocument(document);
			documents.push(document);
		}

		return documents;
	}

	abstract store<M extends Model>(document: M): Promise<void>;
	async set<M extends Model>(document: M): Promise<M> {
		await this.store(document);
		this.#_store.cacheDocument(document);

		return document;
	}

	async remove<M extends Model>(document: M): Promise<void> {
		// We don't call any methods to delete a document here because we don't actually delete anything from the
		// database; we merely *mark* documents as deleted.

		this.#_store.unloadDocument(document);
	}

	abstract query<M extends Model>({ collection }: { collection: Collection }): DocumentQuery<M>;

	abstract dispose(): Promise<void>;
}

abstract class DocumentQuery<M extends Model> {
	abstract whereRegex(property: string, pattern: RegExp): DocumentQuery<M>;

	abstract whereEquals(property: string, value: unknown): DocumentQuery<M>;

	abstract execute(): Promise<M[]>;
}

export { DatabaseAdapter, DocumentSession, DocumentQuery };
