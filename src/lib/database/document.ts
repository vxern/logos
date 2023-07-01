import Fauna from "fauna";

interface BaseDocumentProperties {
	createdAt: number;
}

/** Contains the base properties of data structures stored in the database. */
interface Document<T extends BaseDocumentProperties = BaseDocumentProperties> {
	/** The document reference to this resource in the database. */
	ref: Fauna.values.Ref;

	/** The timestamp of when this resource was created or updated. */
	ts: number;

	/** The data contained within this resource. */
	data: T;
}

export type { BaseDocumentProperties, Document };
