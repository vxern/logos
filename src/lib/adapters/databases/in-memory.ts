import { Collection } from "logos:constants/database";
import { DatabaseAdapter, DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
import { IdentifierDataOrMetadata, Model, ModelConventions } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

class InMemoryAdapter extends DatabaseAdapter {
	async start(): Promise<void> {}

	async stop(): Promise<void> {}

	conventionsFor({ model }: { model: Model }): ModelConventions {
		return new InMemoryConventions({ model });
	}

	async openSession({ store }: { store: DatabaseStore }): Promise<InMemoryDocumentSession> {
		return new InMemoryDocumentSession({ store });
	}
}

class InMemoryDocumentSession extends DocumentSession {
	readonly #_documents: Record<Collection, Map<string, Model>>;

	constructor({ store }: { store: DatabaseStore }) {
		super({ store });

		this.#_documents = Object.fromEntries(
			constants.database.collections.map((collection) => [collection, new Map()]),
		) as Record<Collection, Map<string, Model>>;
	}

	async load<M extends Model>(id: string): Promise<M | undefined> {
		const [collection, partialId] = Model.decomposeId(id);

		return this.#_documents[collection].get(partialId) as M | undefined;
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		return Promise.all(ids.map((id) => this.load<M>(id)));
	}

	async store(object: Model): Promise<void> {
		this.#_documents[object.collection].set(object.id, object);
	}

	async dispose(): Promise<void> {}

	query<M extends Model>({ collection }: { collection: Collection }): DocumentQuery<M> {
		return new InMemoryDocumentQuery<M>({ documents: this.#_documents[collection] as Map<string, M> });
	}
}

class InMemoryDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #_documents: Map<string, M>;

	constructor({ documents }: { documents: Map<string, M> }) {
		super();

		this.#_documents = documents;
	}

	#_whereIdRegex(pattern: RegExp): InMemoryDocumentQuery<M> {
		const newDocuments = new Map<string, M>();
		for (const [partialId, document] of this.#_documents) {
			if (pattern.test(document.id)) {
				newDocuments.set(partialId, document);
			}
		}

		return new InMemoryDocumentQuery({ documents: newDocuments });
	}

	whereRegex(property: string, pattern: RegExp): InMemoryDocumentQuery<M> {
		if (property === "id") {
			return this.#_whereIdRegex(pattern);
		}

		const newDocuments = new Map<string, M>();
		for (const [partialId, document] of this.#_documents) {
			if (property in document) {
				continue;
			}

			const value = document[property as keyof typeof document];
			if (typeof value === "string" && pattern.test(value.toString())) {
				newDocuments.set(partialId, document);
			}
		}

		return new InMemoryDocumentQuery({ documents: newDocuments });
	}

	#_whereIdEquals(value: unknown): InMemoryDocumentQuery<M> {
		const newDocuments = new Map<string, M>();
		for (const [partialId, document] of this.#_documents) {
			if (value === document.id) {
				newDocuments.set(partialId, document);
			}
		}

		return new InMemoryDocumentQuery({ documents: newDocuments });
	}

	whereEquals(property: string, value: unknown): InMemoryDocumentQuery<M> {
		if (property === "id") {
			return this.#_whereIdEquals(value);
		}

		const newDocuments = new Map<string, M>();
		for (const [partialId, document] of this.#_documents) {
			if (property in document) {
				continue;
			}

			if (value === document[property as keyof typeof document]) {
				newDocuments.set(partialId, document);
			}
		}

		return new InMemoryDocumentQuery({ documents: newDocuments });
	}

	async execute(): Promise<M[]> {
		return Array.from(this.#_documents.values());
	}
}

interface InMemoryMetadata {
	readonly _id: string;
	readonly _collection: Collection;
	_isDeleted?: boolean;
}

class InMemoryConventions extends ModelConventions<InMemoryMetadata> {
	get id(): string {
		return this.model._id;
	}

	get collection(): Collection {
		return this.model._collection;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, InMemoryMetadata>): boolean {
		return "_id" in data;
	}

	buildMetadata({ id, collection }: { id: string; collection: Collection }): InMemoryMetadata {
		return { _id: id, _collection: collection };
	}

	markDeleted(): void {
		this.model._isDeleted = true;
	}
}

export { InMemoryAdapter, InMemoryDocumentSession };
