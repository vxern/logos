import { Collection } from "logos:constants/database";
import { Environment } from "logos:core/environment";
import { DocumentSession } from "logos/adapters/databases/adapter";
import { CouchDBDocumentConventions } from "logos/adapters/databases/couchdb/conventions";
import { CouchDBDocument } from "logos/adapters/databases/couchdb/document";
import { CouchDBDocumentQuery } from "logos/adapters/databases/couchdb/query";
import { Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";
import nano from "nano";

class CouchDBDocumentSession extends DocumentSession {
	readonly #_documents: nano.DocumentScope<unknown>;

	constructor({
		environment,
		database,
		documents,
	}: { environment: Environment; database: DatabaseStore; documents: nano.DocumentScope<unknown> }) {
		super({ identifier: "CouchDB", environment, database });

		this.#_documents = documents;
	}

	async load<M extends Model>(id: string): Promise<M | undefined> {
		const rawDocument = await this.#_documents.get(id).catch((error) => {
			if (error.statusCode !== 404) {
				this.log.error(`Failed to get document ${id}: ${error}`);
			}

			return undefined;
		});
		if (rawDocument === undefined) {
			return undefined;
		}

		return CouchDBDocumentConventions.instantiateModel<M>(this.database, rawDocument as CouchDBDocument);
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		if (ids.length === 0) {
			return [];
		}

		const response = await this.#_documents
			.fetch({ keys: ids }, { conflicts: false, include_docs: true })
			.catch((error) => {
				this.log.error(`Failed to get ${ids.length} documents: ${error}`);
				return undefined;
			});
		if (response === undefined) {
			return [];
		}

		const documents: (M | undefined)[] = [];
		for (const result of response.rows) {
			if (result.error !== undefined) {
				documents.push(undefined);
				continue;
			}

			const row = result as nano.DocumentResponseRow<CouchDBDocument>;
			const rowDocument = row.doc!;

			documents.push(CouchDBDocumentConventions.instantiateModel<M>(this.database, rowDocument));
		}

		return documents;
	}

	async store<M extends Model>(document: M): Promise<void> {
		const existingDocument = await this.load(document.id);
		if (existingDocument !== undefined) {
			document.revision = existingDocument.revision!;
		}

		const result = await this.#_documents
			.insert(document as unknown as nano.IdentifiedDocument, { rev: document.revision })
			.catch((error) => {
				// Conflict during insertion. This happens when a document is attempted to be saved twice at the same
				// time.
				if (error.statusCode === 409) {
					this.log.debug(`Encountered conflict when saving document ${document.id}. Ignoring...`);
					return undefined;
				}

				this.log.error(`Failed to store document ${document.id}: ${error}`);
				return undefined;
			});
		if (result === undefined) {
			return;
		}

		if (result.rev !== document.revision) {
			document.revision = result.rev;
		}
	}

	query<M extends Model>(_: { collection: Collection }): CouchDBDocumentQuery<M> {
		return new CouchDBDocumentQuery<M>({ documents: this.#_documents, session: this });
	}

	async dispose(): Promise<void> {}
}

export { CouchDBDocumentSession };
