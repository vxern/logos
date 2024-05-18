import type { Collection } from "logos:constants/database";
import type { Environment } from "logos:core/loaders/environment";
import { DocumentSession } from "logos/adapters/databases/adapter";
import { RavenDBDocumentConventions } from "logos/adapters/databases/ravendb/conventions";
import type { RavenDBDocument } from "logos/adapters/databases/ravendb/document";
import { RavenDBDocumentQuery } from "logos/adapters/databases/ravendb/query";
import type { Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";
import type * as ravendb from "ravendb";

class RavenDBDocumentSession extends DocumentSession {
	readonly #session: ravendb.IDocumentSession;

	constructor({
		environment,
		database,
		session,
	}: { environment: Environment; database: DatabaseStore; session: ravendb.IDocumentSession }) {
		super({ identifier: "RavenDB", environment, database });

		this.#session = session;

		// ! The following line prevents the RavenDB client from trying to convert raw documents to an entity by itself.
		this.#session.advanced.entityToJson.convertToEntity = (_, __, document, ___) => document;
	}

	async load<M extends Model>(id: string): Promise<M | undefined> {
		const rawDocument = await this.#session.load(id);
		if (rawDocument === null) {
			return undefined;
		}

		return RavenDBDocumentConventions.instantiateModel<M>(this.database, rawDocument as RavenDBDocument);
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		const documents: (M | undefined)[] = [];
		const rawDocuments = await this.#session.load(ids);
		for (const rawDocument of Object.values(rawDocuments)) {
			if (rawDocument === null) {
				documents.push(undefined);
				continue;
			}

			documents.push(
				RavenDBDocumentConventions.instantiateModel<M>(this.database, rawDocument as RavenDBDocument),
			);
		}

		return documents;
	}

	async store<M extends Model>(document: M): Promise<void> {
		await this.#session.store(document);
		await this.#session.saveChanges();
	}

	query<M extends Model>(_: { collection: Collection }): RavenDBDocumentQuery<M> {
		return new RavenDBDocumentQuery<M>({ database: this.database, session: this.#session });
	}

	dispose(): void {
		this.#session.dispose();
	}
}

export { RavenDBDocumentSession };
