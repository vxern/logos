import { DocumentQuery } from "logos/adapters/databases/adapter";
import { RavenDBDocumentConventions } from "logos/adapters/databases/ravendb/conventions";
import type { RavenDBDocument } from "logos/adapters/databases/ravendb/document";
import type { Model } from "logos/database/model";
import type { DatabaseStore } from "logos/stores/database";
import type * as ravendb from "ravendb";

class RavenDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #_database: DatabaseStore;
	readonly #_session: ravendb.IDocumentSession;
	#_query: ravendb.IDocumentQuery<RavenDBDocument>;

	constructor({ database, session }: { database: DatabaseStore; session: ravendb.IDocumentSession }) {
		super();

		this.#_database = database;
		this.#_session = session;
		this.#_query = this.#_session.query({});
	}

	whereRegex(property: string, pattern: RegExp): RavenDBDocumentQuery<M> {
		this.#_query = this.#_query.whereRegex(property, pattern.source);
		return this;
	}

	whereEquals(property: string, value: unknown): RavenDBDocumentQuery<M> {
		this.#_query = this.#_query.whereEquals(property, value);
		return this;
	}

	async execute(): Promise<M[]> {
		const rawDocuments = await this.#_query.all();
		return rawDocuments.map((document) => RavenDBDocumentConventions.instantiateModel(this.#_database, document));
	}
}

export { RavenDBDocumentQuery };
