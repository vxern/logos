import { DocumentQuery } from "logos/adapters/databases/adapter";
import type { CouchDBDocumentSession } from "logos/adapters/databases/couchdb/session";
import type { Model } from "logos/database/model";
import type nano from "nano";

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
		Object.assign(this.#_query.selector, {
			[property === "id" ? "_id" : property]: { $regex: pattern.source },
		});
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

export { CouchDBDocumentQuery };
