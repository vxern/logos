import { DocumentQuery } from "logos/adapters/databases/adapter";
import type { CouchDBDocumentSession } from "logos/adapters/databases/couchdb/session";
import type { Model } from "logos/database/model";
import type nano from "nano";

class CouchDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #documents: nano.DocumentScope<unknown>;
	readonly #session: CouchDBDocumentSession;
	readonly #query: nano.MangoQuery;

	constructor({ documents, session }: { documents: nano.DocumentScope<unknown>; session: CouchDBDocumentSession }) {
		super();

		this.#documents = documents;
		this.#session = session;
		this.#query = { selector: {} };
	}

	whereRegex(property: string, pattern: RegExp): CouchDBDocumentQuery<M> {
		Object.assign(this.#query.selector, {
			[property === "id" ? "_id" : property]: { $regex: pattern.source },
		});
		return this;
	}

	whereEquals(property: string, value: unknown): CouchDBDocumentQuery<M> {
		Object.assign(this.#query.selector, { [property === "id" ? "_id" : property]: { $eq: value } });
		return this;
	}

	async execute(): Promise<M[]> {
		const result = await this.#documents.find(this.#query);
		const ids = result.docs.map((document) => document._id);
		return (await this.#session.loadMany(ids)) as M[];
	}
}

export { CouchDBDocumentQuery };
