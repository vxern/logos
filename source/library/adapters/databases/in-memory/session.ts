import type { Collection } from "logos:constants/database";
import { type DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
import { InMemoryDocumentQuery } from "logos/adapters/databases/in-memory/query";
import { Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";

class InMemoryDocumentSession extends DocumentSession {
	readonly #documents: Record<Collection, Map<string, Model>>;

	constructor({ database }: { database: DatabaseStore }) {
		super({ identifier: "InMemory", database });

		this.#documents = Object.fromEntries(
			constants.database.collections.map((collection) => [collection, new Map()]),
		) as Record<Collection, Map<string, Model>>;
	}

	async load<M extends Model>(id: string): Promise<M | undefined> {
		const [collection, partialId] = Model.decomposeId(id);

		return this.#documents[collection].get(partialId) as M | undefined;
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		return Promise.all(ids.map((id) => this.load<M>(id)));
	}

	async store(object: Model): Promise<void> {
		this.#documents[object.collection].set(object.id, object);
	}

	query<M extends Model>({ collection }: { collection: Collection }): DocumentQuery<M> {
		return new InMemoryDocumentQuery<M>({ documents: this.#documents[collection] as Map<string, M> });
	}
}

export { InMemoryDocumentSession };
