import type { Collection } from "logos:constants/database";
import { DocumentQuery } from "logos/adapters/databases/adapter";
import { RethinkDBDocumentConventions } from "logos/adapters/databases/rethinkdb/conventions";
import type { RethinkDBDocument } from "logos/adapters/databases/rethinkdb/document";
import type { Model } from "logos/database/model";
import type { DatabaseStore } from "logos/stores/database";
import rethinkdb from "rethinkdb-ts";

class RethinkDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #collection: Collection;
	readonly #database: DatabaseStore;
	readonly #connection: rethinkdb.Connection;
	#query: rethinkdb.RTable<RethinkDBDocument>;

	constructor({
		database,
		connection,
		collection,
	}: { database: DatabaseStore; connection: rethinkdb.Connection; collection: Collection }) {
		super();

		this.#collection = collection;
		this.#database = database;
		this.#connection = connection;
		this.#query = rethinkdb.r.table(this.#collection);
	}

	whereRegex(property: string, pattern: RegExp): RethinkDBDocumentQuery<M> {
		this.#query = this.#query.filter((document) => document(property).match(pattern.source));
		return this;
	}

	whereEquals(property: string, value: unknown): RethinkDBDocumentQuery<M> {
		this.#query = this.#query.filter({ [property]: value });
		return this;
	}

	async execute(): Promise<M[]> {
		const rawDocuments = await this.#query.run(this.#connection);
		return rawDocuments.map((rawDocument) =>
			RethinkDBDocumentConventions.instantiateModel<M>(this.#database, rawDocument),
		);
	}
}

export { RethinkDBDocumentQuery };
