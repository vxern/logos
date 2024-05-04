import { Collection } from "logos:constants/database";
import { DatabaseAdapter, DocumentConventions, DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
import { Environment } from "logos/client";
import { IdentifierDataOrMetadata, Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

class InMemoryAdapter extends DatabaseAdapter {
	constructor({ environment }: { environment: Environment }) {
		super({ environment, identifier: "InMemory" });
	}

	async start(): Promise<void> {}

	async stop(): Promise<void> {}

	conventionsFor({
		document,
		data,
		collection,
	}: {
		document: Model;
		data: IdentifierDataOrMetadata<Model, InMemoryDocumentMetadata>;
		collection: Collection;
	}): DocumentConventions {
		return new InMemoryConventions({ document, data, collection });
	}

	async openSession({
		environment,
		database,
	}: { environment: Environment; database: DatabaseStore }): Promise<InMemoryDocumentSession> {
		return new InMemoryDocumentSession({ environment, database });
	}
}

class InMemoryDocumentSession extends DocumentSession {
	readonly #_documents: Record<Collection, Map<string, Model>>;

	constructor({ environment, database }: { environment: Environment; database: DatabaseStore }) {
		super({ environment, identifier: "InMemory", database });

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
	#_documents: Map<string, M>;

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

		this.#_documents = newDocuments;
		return this;
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

		this.#_documents = newDocuments;
		return this;
	}

	#_whereIdEquals(value: unknown): InMemoryDocumentQuery<M> {
		const newDocuments = new Map<string, M>();
		for (const [partialId, document] of this.#_documents) {
			if (value === document.id) {
				newDocuments.set(partialId, document);
			}
		}

		this.#_documents = newDocuments;
		return this;
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

		this.#_documents = newDocuments;
		return this;
	}

	async execute(): Promise<M[]> {
		return Array.from(this.#_documents.values());
	}
}

interface InMemoryDocumentMetadata {
	readonly _id: string;
	_isDeleted?: boolean;
}

class InMemoryConventions extends DocumentConventions<InMemoryDocumentMetadata> {
	get id(): string {
		return this.document._id;
	}

	get isDeleted(): boolean | undefined {
		return this.document._isDeleted;
	}

	set isDeleted(value: boolean) {
		this.document._isDeleted = value;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, InMemoryDocumentMetadata>): boolean {
		return "_id" in data;
	}

	buildMetadata({ id, collection: _ }: { id: string; collection: Collection }): InMemoryDocumentMetadata {
		return { _id: id };
	}
}

export { InMemoryAdapter, InMemoryDocumentSession };
