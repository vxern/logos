import { Collection, isValidCollection } from "logos:constants/database";
import { DatabaseAdapter, DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
import { IdentifierDataOrMetadata, Model, ModelConventions } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";
import * as ravendb from "ravendb";

class RavenDBAdapter extends DatabaseAdapter {
	readonly #_database: ravendb.DocumentStore;

	constructor({
		host,
		port,
		database,
		certificate,
	}: { database: string; host: string; port: string; certificate?: Buffer }) {
		super();

		const hostWithPort = `${host}:${port}`;
		if (certificate !== undefined) {
			this.#_database = new ravendb.DocumentStore(hostWithPort, database, { certificate, type: "pfx" });
		} else {
			this.#_database = new ravendb.DocumentStore(hostWithPort, database);
		}
	}

	async start(): Promise<void> {
		this.#_database.initialize();
	}

	async stop(): Promise<void> {
		this.#_database.dispose();
	}

	conventionsFor({ model }: { model: Model }): ModelConventions {
		return new RavenDBModelConventions({ model });
	}

	async openSession({ database }: { database: DatabaseStore }): Promise<RavenDBDocumentSession> {
		const rawSession = this.#_database.openSession();

		return new RavenDBDocumentSession({ database, session: rawSession });
	}
}

interface RavenDBDocument extends RavenDBDocumentMetadataContainer {
	[key: string]: unknown;
}

interface RavenDBDocumentMetadataContainer {
	"@metadata": RavenDBDocumentMetadata;
}

interface RavenDBDocumentMetadata {
	readonly "@id": string;
	readonly "@collection": Collection;
	"@is-deleted"?: boolean;
}

class RavenDBDocumentSession extends DocumentSession {
	readonly #_session: ravendb.IDocumentSession;

	constructor({ database, session }: { database: DatabaseStore; session: ravendb.IDocumentSession }) {
		super({ database });

		this.#_session = session;

		// ! This logic needs to be turned off as Logos performs model operations and conversions on its own.
		// ! The following line prevents the RavenDB client from trying to convert raw documents to an entity.
		this.#_session.advanced.entityToJson.convertToEntity = (_, __, document, ___) => document;
	}

	async load<M extends Model>(id: string): Promise<M | undefined> {
		const rawDocument = await this.#_session.load(id);
		if (rawDocument === null) {
			return undefined;
		}

		return RavenDBModelConventions.instantiateModel<M>(this.database, rawDocument as RavenDBDocument);
	}

	async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		const documents: (M | undefined)[] = [];
		const rawDocuments = await this.#_session.load(ids);
		for (const rawDocument of Object.values(rawDocuments)) {
			if (rawDocument === null) {
				documents.push(undefined);
				continue;
			}

			documents.push(RavenDBModelConventions.instantiateModel<M>(this.database, rawDocument as RavenDBDocument));
		}

		return documents;
	}

	async store<M extends Model>(document: M): Promise<void> {
		await this.#_session.store(document);
		await this.#_session.saveChanges();
	}

	query<M extends Model>({ collection }: { collection: Collection }): RavenDBDocumentQuery<M> {
		return new RavenDBDocumentQuery<M>({ query: this.#_session.query<M>({ collection }) });
	}

	async dispose(): Promise<void> {}
}

class RavenDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #_query: ravendb.IDocumentQuery<M>;

	constructor({ query }: { query: ravendb.IDocumentQuery<M> }) {
		super();

		this.#_query = query;
	}

	whereRegex(property: string, pattern: RegExp): RavenDBDocumentQuery<M> {
		return new RavenDBDocumentQuery({ query: this.#_query.whereRegex(property, pattern.toString()) });
	}

	whereEquals(property: string, value: unknown): RavenDBDocumentQuery<M> {
		return new RavenDBDocumentQuery<M>({ query: this.#_query.whereEquals(property, value) });
	}

	async execute(): Promise<M[]> {
		return await this.#_query.all();
	}
}

class RavenDBModelConventions extends ModelConventions<RavenDBDocumentMetadataContainer> {
	get id(): string {
		return this.model["@metadata"]["@id"];
	}

	get collection(): Collection {
		return this.model["@metadata"]["@collection"];
	}

	static instantiateModel<M extends Model>(database: DatabaseStore, payload: RavenDBDocument): M {
		if (!isValidCollection(payload["@metadata"]["@collection"])) {
			throw `Document ${payload.id} is part of an unknown collection: "${payload["@metadata"]["@collection"]}"`;
		}

		const Class = DatabaseStore.getModelClassByCollection({
			collection: payload["@metadata"]["@collection"] as Collection,
		});

		return new Class(database, payload) as M;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, RavenDBDocumentMetadataContainer>): boolean {
		return "@metadata" in data;
	}

	buildMetadata({ id, collection }: { id: string; collection: Collection }): RavenDBDocumentMetadataContainer {
		return { "@metadata": { "@id": id, "@collection": collection } };
	}

	markDeleted(): void {
		this.model["@metadata"]["@is-deleted"] = true;
	}
}

export { RavenDBAdapter, RavenDBDocumentSession };
