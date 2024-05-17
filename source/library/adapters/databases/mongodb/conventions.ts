import type { Collection } from "logos:constants/database";
import { DocumentConventions } from "logos/adapters/databases/adapter";
import type { MongoDBDocument, MongoDBDocumentMetadata } from "logos/adapters/databases/mongodb/document";
import { type IdentifierDataOrMetadata, Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

class MongoDBDocumentConventions extends DocumentConventions<MongoDBDocumentMetadata> {
	get id(): string {
		return this.document._id;
	}

	get isDeleted(): boolean | undefined {
		return this.document._isDeleted;
	}

	set isDeleted(value: boolean) {
		this.document._isDeleted = value;
	}

	static instantiateModel<M extends Model>(database: DatabaseStore, payload: MongoDBDocument): M {
		const [collection, _] = Model.getDataFromId(payload._id);
		const ModelClass = DatabaseStore.getModelClassByCollection({ collection: collection });

		return new ModelClass(database, payload) as M;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, MongoDBDocumentMetadata>): boolean {
		return "_id" in data;
	}

	buildMetadata({ id, collection: _ }: { id: string; collection: Collection }): MongoDBDocumentMetadata {
		return { _id: id };
	}
}

export { MongoDBDocumentConventions };
