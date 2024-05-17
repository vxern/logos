import type { Collection } from "logos:constants/database";
import { DocumentConventions } from "logos/adapters/databases/adapter";
import type { InMemoryDocumentMetadata } from "logos/adapters/databases/in-memory/document";
import type { IdentifierDataOrMetadata, Model } from "logos/database/model";

class InMemoryDocumentConventions extends DocumentConventions<InMemoryDocumentMetadata> {
	get id(): string {
		return this.document._id;
	}

	get isDeleted(): boolean | undefined {
		return this.document._isDeleted;
	}

	set isDeleted(value: boolean) {
		this.document._isDeleted = value;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, InMemoryDocumentMetadata>): boolean {
		return "_id" in data;
	}

	buildMetadata({ id, collection: _ }: { id: string; collection: Collection }): InMemoryDocumentMetadata {
		return { _id: id };
	}
}

export { InMemoryDocumentConventions };
