import { Collection } from "logos:constants/database";
import { DocumentQuery } from "logos/adapters/databases/adapter";
import { RethinkDBDocumentConventions } from "logos/adapters/databases/rethinkdb/conventions";
import { RethinkDBDocument } from "logos/adapters/databases/rethinkdb/document";
import { Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";
import rethinkdb from "rethinkdb-ts";

class RethinkDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #collection: Collection;

	readonly #_database: DatabaseStore;
	readonly #_connection: rethinkdb.Connection;
	#_query: rethinkdb.RTable<RethinkDBDocument>;

	constructor({
		database,
		connection,
		collection,
	}: { database: DatabaseStore; connection: rethinkdb.Connection; collection: Collection }) {
		super();

		this.#collection = collection;
		this.#_database = database;
		this.#_connection = connection;
		this.#_query = rethinkdb.r.table(this.#collection);
	}

	whereRegex(property: string, pattern: RegExp): RethinkDBDocumentQuery<M> {
		this.#_query = this.#_query.filter((document) => document(property).match(pattern.toString()));
		return this;
	}

	whereEquals(property: string, value: unknown): RethinkDBDocumentQuery<M> {
		this.#_query = this.#_query.filter({ [property]: value });
		return this;
	}

	async execute(): Promise<M[]> {
		const rawDocuments = await this.#_query.run(this.#_connection);
		return rawDocuments.map((rawDocument) =>
			RethinkDBDocumentConventions.instantiateModel<M>(this.#_database, rawDocument),
		);
	}
}

export { RethinkDBDocumentQuery };
