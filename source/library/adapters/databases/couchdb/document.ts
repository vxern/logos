import nano from "nano";

type CouchDBDocumentMetadata = Omit<nano.DocumentGetResponse, "_rev"> & { _rev?: string };

interface CouchDBDocument extends CouchDBDocumentMetadata {
	[key: string]: unknown;
}

export type { CouchDBDocumentMetadata, CouchDBDocument };
