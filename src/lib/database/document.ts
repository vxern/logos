interface BaseDocumentProperties {
	createdAt: number;
}

/** Contains the base properties of data structures stored in the database. */
interface Document<T extends BaseDocumentProperties = BaseDocumentProperties> {
	/** The document reference to this resource in the database. */
	ref: Reference;

	/** The timestamp of when this resource was created or updated. */
	ts: number;

	/** The data contained within this resource. */
	data: T;
}

/** Represents a document reference in the Fauna database. */
interface Reference {
	/** The value of this reference. */
	value: {
		/** The ID of this reference. */
		id: string;

		/** The collection in which the referenced document lies. */
		collection?: Reference;
	};
}

export type { BaseDocumentProperties, Document, Reference };
