interface MongoDBDocumentMetadata {
	readonly _id: string;
	_isDeleted?: boolean;
}

interface MongoDBDocument extends MongoDBDocumentMetadata {
	[key: string]: unknown;
}

export type { MongoDBDocument, MongoDBDocumentMetadata };
