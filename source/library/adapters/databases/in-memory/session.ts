import type { Collection } from "logos:constants/database";
import type { Environment } from "logos:core/loaders/environment";
import { type DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
import { InMemoryDocumentQuery } from "logos/adapters/databases/in-memory/query";
import { Model } from "logos/database/model";
import type { DatabaseStore } from "logos/stores/database";

class InMemoryDocumentSession extends DocumentSession {
	readonly #_documents: Record<Collection, Map<string, Model>>;

	constructor({ environment, database }: { environment: Environment; database: DatabaseStore }) {
		super({ environment, identifier: "InMemory", database });

		this.#_documents = Object.fromEntries(
			constants.database.collections.map((collection) => [collection, new Map()]),
		) as Record<Collection, Map<string, Model>>;
	}

	// biome-ignore lint/suspicious/useAwait: This did not want to work with a T | Promise<T> typing, unfortunately.
	async load<M extends Model>(id: string): Promise<M | undefined> {
		const [collection, partialId] = Model.decomposeId(id);

		return this.#_documents[collection].get(partialId) as M | undefined;
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		return Promise.all(ids.map((id) => this.load<M>(id)));
	}

	store(object: Model): void {
		this.#_documents[object.collection].set(object.id, object);
	}

	async dispose(): Promise<void> {}

	query<M extends Model>({ collection }: { collection: Collection }): DocumentQuery<M> {
		return new InMemoryDocumentQuery<M>({ documents: this.#_documents[collection] as Map<string, M> });
	}
}

export { InMemoryDocumentSession };
