import { DatabaseAdapter, DocumentSession } from "logos/adapters/databases/adapter";
import { DatabaseStore } from "logos/stores/database";

class InMemoryAdapter extends DatabaseAdapter {
	async start(): Promise<void> {}

	async stop(): Promise<void> {}

	async openSession({ store }: { store: DatabaseStore }): Promise<InMemoryDocumentSession> {
		return new InMemoryDocumentSession({ store });
	}
}

class InMemoryDocumentSession extends DocumentSession {
	readonly #_documents: Map<string, object>;

	constructor({ store }: { store: DatabaseStore }) {
		super({ store });

		this.#_documents = new Map();
	}

	async load(id: string): Promise<object | undefined | null> {
		return this.#_documents.get(id);
	}

	async loadMany(ids: string[]): Promise<(object | undefined | null)[]> {
		return ids.map((id) => this.#_documents.get(id));
	}

	async store(object: object): Promise<void> {
		this.#_documents.set(object.id, object);
	}

	async dispose(): Promise<void> {}
}

export { InMemoryAdapter, InMemoryDocumentSession };
