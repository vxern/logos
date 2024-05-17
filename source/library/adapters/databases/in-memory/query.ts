import { DocumentQuery } from "logos/adapters/databases/adapter";
import type { Model } from "logos/database/model";

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

			const value = document[property as keyof typeof document] as unknown;
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

	execute(): M[] {
		return Array.from(this.#_documents.values());
	}
}

export { InMemoryDocumentQuery };
