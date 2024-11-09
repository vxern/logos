import type { Collection } from "logos:constants/database";
import { DatabaseAdapter, type DocumentConventions } from "logos/adapters/databases/adapter";
import { InMemoryDocumentConventions } from "logos/adapters/databases/in-memory/conventions";
import type { InMemoryDocumentMetadata } from "logos/adapters/databases/in-memory/document";
import { InMemoryDocumentSession } from "logos/adapters/databases/in-memory/session";
import type { IdentifierDataOrMetadata, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";
import type pino from "pino";

class InMemoryAdapter extends DatabaseAdapter {
	constructor({ log }: { log: pino.Logger }) {
		super({ identifier: "InMemory", log });
	}

	conventionsFor({
		document,
		data,
		collection,
	}: {
		document: Model;
		data: IdentifierDataOrMetadata<Model, InMemoryDocumentMetadata>;
		collection: Collection;
	}): DocumentConventions {
		return new InMemoryDocumentConventions({ document, data, collection });
	}

	openSession({ database }: { database: DatabaseStore }): InMemoryDocumentSession {
		return new InMemoryDocumentSession({ database });
	}
}

export { InMemoryAdapter };
