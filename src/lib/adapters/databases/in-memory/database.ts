import { Collection } from "logos:constants/database";
import { Environment } from "logos:core/environment";
import { DatabaseAdapter, DocumentConventions } from "logos/adapters/databases/adapter";
import { InMemoryDocumentConventions } from "logos/adapters/databases/in-memory/conventions";
import { InMemoryDocumentMetadata } from "logos/adapters/databases/in-memory/document";
import { InMemoryDocumentSession } from "logos/adapters/databases/in-memory/session";
import { IdentifierDataOrMetadata, Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

class InMemoryAdapter extends DatabaseAdapter {
	constructor({ environment }: { environment: Environment }) {
		super({ environment, identifier: "InMemory" });
	}

	async start(): Promise<void> {}

	async stop(): Promise<void> {}

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

	async openSession({
		environment,
		database,
	}: { environment: Environment; database: DatabaseStore }): Promise<InMemoryDocumentSession> {
		return new InMemoryDocumentSession({ environment, database });
	}
}

export { InMemoryAdapter };
