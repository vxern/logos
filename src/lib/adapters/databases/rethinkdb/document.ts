interface RethinkDBDocumentMetadata {
	readonly id: string;
	_isDeleted?: boolean;
}

interface RethinkDBDocument extends RethinkDBDocumentMetadata {
	[key: string]: unknown;
}

export type { RethinkDBDocumentMetadata, RethinkDBDocument };
