import type { Collection } from "logos:constants/database";
import { DocumentQuery } from "logos/adapters/databases/adapter";
import { MongoDBDocumentConventions } from "logos/adapters/databases/mongodb/conventions";
import type { MongoDBDocument } from "logos/adapters/databases/mongodb/document";
import type { MongoDBDocumentSession } from "logos/adapters/databases/mongodb/session";
import type { Model } from "logos/database/model";
import type mongodb from "mongodb";

class MongoDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #mongoDatabase: mongodb.Db;
	readonly #session: MongoDBDocumentSession;
	readonly #collection: Collection;
	readonly #filter: mongodb.Filter<MongoDBDocument>;

	constructor({
		mongoDatabase,
		session,
		collection,
	}: {
		mongoDatabase: mongodb.Db;
		session: MongoDBDocumentSession;
		collection: Collection;
	}) {
		super();

		this.#mongoDatabase = mongoDatabase;
		this.#session = session;
		this.#collection = collection;
		this.#filter = {};
	}

	whereRegex(property: string, pattern: RegExp): MongoDBDocumentQuery<M> {
		Object.assign(this.#filter, { [property === "id" ? "_id" : property]: { $regex: pattern } });
		return this;
	}

	whereEquals(property: string, value: unknown): MongoDBDocumentQuery<M> {
		Object.assign(this.#filter, { [property === "id" ? "_id" : property]: { $eq: value } });
		return this;
	}

	async execute(): Promise<M[]> {
		const rawDocuments = await this.#mongoDatabase
			.collection<MongoDBDocument>(this.#collection)
			.find(this.#filter)
			.toArray();
		return rawDocuments.map((rawDocument) =>
			MongoDBDocumentConventions.instantiateModel(this.#session.database, rawDocument),
		);
	}
}

export { MongoDBDocumentQuery };
