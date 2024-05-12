import { Collection, isValidCollection } from "logos:constants/database";
import { DocumentConventions } from "logos/adapters/databases/adapter";
import { RavenDBDocument, RavenDBDocumentMetadataContainer } from "logos/adapters/databases/ravendb/document";
import { IdentifierDataOrMetadata, Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

class RavenDBDocumentConventions extends DocumentConventions<RavenDBDocumentMetadataContainer> {
	get id(): string {
		return this.document["@metadata"]["@id"];
	}

	get revision(): string | undefined {
		return this.document["@metadata"]["@change-vector"];
	}

	set revision(value: string) {
		this.document["@metadata"]["@change-vector"] = value;
	}

	get isDeleted(): boolean | undefined {
		return this.document["@metadata"]["@is-deleted"];
	}

	set isDeleted(value: boolean) {
		this.document["@metadata"]["@is-deleted"] = value;
	}

	static instantiateModel<M extends Model>(database: DatabaseStore, payload: RavenDBDocument): M {
		if (!isValidCollection(payload["@metadata"]["@collection"])) {
			throw `Document ${payload.id} is part of an unknown collection: "${payload["@metadata"]["@collection"]}"`;
		}

		const ModelClass = DatabaseStore.getModelClassByCollection({
			collection: payload["@metadata"]["@collection"] as Collection,
		});

		return new ModelClass(database, payload) as M;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, RavenDBDocumentMetadataContainer>): boolean {
		return "@metadata" in data;
	}

	buildMetadata({ id, collection }: { id: string; collection: Collection }): RavenDBDocumentMetadataContainer {
		return { "@metadata": { "@id": id, "@collection": collection } };
	}
}

export { RavenDBDocumentConventions };
