/** Contains the base properties of data structures stored in the database. */
interface Document<T> {
	/** Reference to this resource in the database. */
	ref: string;

	/** Timestamp of when this resource was created. */
	ts: number;

	/** Data contained within this resource. */
	data: T;
}

export type { Document };
