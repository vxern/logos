import { Collection } from "logos:constants/database";
import { Environment } from "logos:core/loaders/environment";
import { DocumentSession } from "logos/adapters/databases/adapter";
import { MongoDBDocumentConventions } from "logos/adapters/databases/mongodb/conventions";
import { MongoDBDocument } from "logos/adapters/databases/mongodb/document";
import { MongoDBDocumentQuery } from "logos/adapters/databases/mongodb/query";
import { Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";
import mongodb from "mongodb";

class MongoDBDocumentSession extends DocumentSession {
	readonly #_mongoDatabase: mongodb.Db;

	constructor({
		environment,
		database,
		mongoDatabase,
	}: { environment: Environment; database: DatabaseStore; mongoDatabase: mongodb.Db }) {
		super({ identifier: "MongoDB", environment, database });

		this.#_mongoDatabase = mongoDatabase;
	}

	async load<M extends Model>(id: string): Promise<M | undefined> {
		const [collection, _] = Model.decomposeId(id);
		const rawDocument = await this.#_mongoDatabase.collection<MongoDBDocument>(collection).findOne({ _id: id });
		if (rawDocument === null) {
			return undefined;
		}

		return MongoDBDocumentConventions.instantiateModel<M>(this.database, rawDocument as MongoDBDocument);
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		return this.loadManyTabulated<M, MongoDBDocument>(ids, {
			loadMany: (ids, { collection }) =>
				this.#_mongoDatabase.collection<MongoDBDocument>(collection).find({ _id: ids }).toArray(),
			instantiateModel: (database, rawDocument) =>
				MongoDBDocumentConventions.instantiateModel<M>(database, rawDocument),
		});
	}

	async store<M extends Model>(document: M): Promise<void> {
		const [collection, _] = Model.decomposeId(document.id);
		await this.#_mongoDatabase
			.collection<MongoDBDocument>(collection)
			.updateOne({ _id: document.id }, { $set: document as unknown as MongoDBDocument }, { upsert: true });
	}

	query<M extends Model>({ collection }: { collection: Collection }): MongoDBDocumentQuery<M> {
		return new MongoDBDocumentQuery<M>({ mongoDatabase: this.#_mongoDatabase, session: this, collection });
	}

	async dispose(): Promise<void> {}
}

export { MongoDBDocumentSession };