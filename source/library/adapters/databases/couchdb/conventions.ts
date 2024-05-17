import type { Collection } from "logos:constants/database";
import { DocumentConventions } from "logos/adapters/databases/adapter";
import type { CouchDBDocument, CouchDBDocumentMetadata } from "logos/adapters/databases/couchdb/document";
import { type IdentifierDataOrMetadata, Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

class CouchDBDocumentConventions extends DocumentConventions<CouchDBDocumentMetadata> {
	get id(): string {
		return this.document._id;
	}

	get revision(): string | undefined {
		return this.document._rev;
	}

	set revision(value: string) {
		this.document._rev = value;
	}

	get isDeleted(): boolean | undefined {
		return this.document._deleted;
	}

	set isDeleted(value: boolean) {
		this.document._deleted = value;
	}

	static instantiateModel<M extends Model>(database: DatabaseStore, payload: CouchDBDocument): M {
		const [collection, _] = Model.getDataFromId(payload._id);
		const ModelClass = DatabaseStore.getModelClassByCollection({ collection: collection });

		return new ModelClass(database, payload) as M;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, CouchDBDocumentMetadata>): boolean {
		return "_id" in data;
	}

	buildMetadata({ id, collection: _ }: { id: string; collection: Collection }): CouchDBDocumentMetadata {
		return { _id: id };
	}
}

export { CouchDBDocumentConventions };
