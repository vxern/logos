import { Collection } from "logos:constants/database";
import { DocumentConventions } from "logos/adapters/databases/adapter";
import { RethinkDBDocument, RethinkDBDocumentMetadata } from "logos/adapters/databases/rethinkdb/document";
import { IdentifierDataOrMetadata, Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

class RethinkDBDocumentConventions extends DocumentConventions<RethinkDBDocumentMetadata> {
	get id(): string {
		return this.document.id;
	}

	get isDeleted(): boolean | undefined {
		return this.document._isDeleted;
	}

	set isDeleted(value: boolean) {
		this.document._isDeleted = value;
	}

	static instantiateModel<M extends Model>(database: DatabaseStore, payload: RethinkDBDocument): M {
		const [collection, _] = Model.getDataFromId(payload.id);
		const ModelClass = DatabaseStore.getModelClassByCollection({ collection: collection });

		return new ModelClass(database, payload) as M;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, RethinkDBDocumentMetadata>): boolean {
		return "id" in data;
	}

	buildMetadata({ id, collection: _ }: { id: string; collection: Collection }): RethinkDBDocumentMetadata {
		return { id };
	}

	/**
	 * @privateRemarks
	 * This method is intentionally empty: The base implementation of this method applies an `id` getter on the managed
	 * model by default, since in most cases the property stored on the model is not `id` verbatim, but rather something
	 * like `_id` or `@id`. In the case of RethinkDB, however, the document ID property *is* `id`, so we ought to omit this
	 * getter assignment.
	 */
	assignAccessorsToModel(): void {}
}

export { RethinkDBDocumentConventions };