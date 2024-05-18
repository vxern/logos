import type { Collection } from "logos:constants/database";
import type { Environment } from "logos:core/loaders/environment";
import { DatabaseAdapter, type DocumentConventions } from "logos/adapters/databases/adapter";
import { InMemoryDocumentConventions } from "logos/adapters/databases/in-memory/conventions";
import type { InMemoryDocumentMetadata } from "logos/adapters/databases/in-memory/document";
import { InMemoryDocumentSession } from "logos/adapters/databases/in-memory/session";
import type { IdentifierDataOrMetadata, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";

class InMemoryAdapter extends DatabaseAdapter {
	constructor({ environment }: { environment: Environment }) {
		super({ environment, identifier: "InMemory" });
	}

	async setup(): Promise<void> {}

	async teardown(): Promise<void> {}

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

	openSession({
		environment,
		database,
	}: { environment: Environment; database: DatabaseStore }): InMemoryDocumentSession {
		return new InMemoryDocumentSession({ environment, database });
	}
}

export { InMemoryAdapter };
