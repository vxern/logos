import fs from "node:fs/promises";
import { Collection, isValidCollection } from "logos:constants/database";
import { DatabaseAdapter, DocumentConventions, DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
import { Environment } from "logos/client";
import { IdentifierDataOrMetadata, Model } from "logos/database/model";
import { Logger } from "logos/logger";
import { DatabaseStore } from "logos/stores/database";
import * as ravendb from "ravendb";

class RavenDBAdapter extends DatabaseAdapter {
	readonly #_database: ravendb.DocumentStore;

	private constructor({
		environment,
		host,
		port,
		database,
		certificate,
	}: { environment: Environment; host: string; port: string; database: string; certificate?: Buffer }) {
		super({ identifier: "RavenDB", environment });

		const url = `${host}:${port}`;
		if (certificate !== undefined) {
			this.#_database = new ravendb.DocumentStore(url, database, { certificate, type: "pfx" });
		} else {
			this.#_database = new ravendb.DocumentStore(url, database);
		}
	}

	static async tryCreate({
		environment,
		log,
	}: { environment: Environment; log: Logger }): Promise<RavenDBAdapter | undefined> {
		if (
			environment.ravendbHost === undefined ||
			environment.ravendbPort === undefined ||
			environment.ravendbDatabase === undefined
		) {
			log.error("One or more of `RAVENDB_HOST`, `RAVENDB_PORT` or `RAVENDB_DATABASE` have not been provided.");
			return undefined;
		}

		let certificate: Buffer | undefined;
		if (environment.ravendbSecure) {
			certificate = await fs.readFile(".cert.pfx");
		}

		return new RavenDBAdapter({
			environment,
			host: environment.ravendbHost,
			port: environment.ravendbPort,
			database: environment.ravendbDatabase,
			certificate,
		});
	}

	async start(): Promise<void> {
		this.#_database.initialize();
	}

	async stop(): Promise<void> {
		this.#_database.dispose();
	}

	conventionsFor({
		document,
		data,
		collection,
	}: {
		document: Model;
		data: IdentifierDataOrMetadata<Model, RavenDBDocumentMetadataContainer>;
		collection: Collection;
	}): DocumentConventions {
		return new RavenDBModelConventions({ document, data, collection });
	}

	async openSession({
		environment,
		database,
	}: { environment: Environment; database: DatabaseStore }): Promise<RavenDBDocumentSession> {
		const rawSession = this.#_database.openSession();

		return new RavenDBDocumentSession({ environment, database, session: rawSession });
	}
}

interface RavenDBDocumentMetadataContainer {
	"@metadata": RavenDBDocumentMetadata;
}

interface RavenDBDocumentMetadata extends WithRequired<ravendb.MetadataObject, "@id"> {
	readonly "@id": string;
	readonly "@collection": Collection;
	"@is-deleted"?: boolean;
}

interface RavenDBDocument extends RavenDBDocumentMetadataContainer {
	[key: string]: unknown;
}

class RavenDBDocumentSession extends DocumentSession {
	readonly #_session: ravendb.IDocumentSession;

	constructor({
		environment,
		database,
		session,
	}: { environment: Environment; database: DatabaseStore; session: ravendb.IDocumentSession }) {
		super({ identifier: "RavenDB", environment, database });

		this.#_session = session;

		// ! The following line prevents the RavenDB client from trying to convert raw documents to an entity by itself.
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

	query<M extends Model>(_: { collection: Collection }): RavenDBDocumentQuery<M> {
		return new RavenDBDocumentQuery<M>({ database: this.database, session: this.#_session });
	}

	async dispose(): Promise<void> {
		this.#_session.dispose();
	}
}

class RavenDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
	readonly #_database: DatabaseStore;
	readonly #_session: ravendb.IDocumentSession;
	#_query: ravendb.IDocumentQuery<RavenDBDocument>;

	constructor({ database, session }: { database: DatabaseStore; session: ravendb.IDocumentSession }) {
		super();

		this.#_database = database;
		this.#_session = session;
		this.#_query = this.#_session.query({});
	}

	whereRegex(property: string, pattern: RegExp): RavenDBDocumentQuery<M> {
		this.#_query = this.#_query.whereRegex(property, pattern.toString());
		return this;
	}

	whereEquals(property: string, value: unknown): RavenDBDocumentQuery<M> {
		this.#_query = this.#_query.whereEquals(property, value);
		return this;
	}

	async execute(): Promise<M[]> {
		const rawDocuments = await this.#_query.all();
		return rawDocuments.map((document) => RavenDBModelConventions.instantiateModel(this.#_database, document));
	}
}

class RavenDBModelConventions extends DocumentConventions<RavenDBDocumentMetadataContainer> {
	get id(): string {
		return this.document["@metadata"]["@id"];
	}

	get revision(): string | undefined {
		return this.document["@metadata"]["@change-vector"];
	}

	set revision(value: string) {
		this.document["@metadata"]["@change-vector"] = value;
	}

	get isDeleted(): boolean | undefined {
		return this.document["@metadata"]["@is-deleted"];
	}

	set isDeleted(value: boolean) {
		this.document["@metadata"]["@is-deleted"] = value;
	}

	static instantiateModel<M extends Model>(database: DatabaseStore, payload: RavenDBDocument): M {
		if (!isValidCollection(payload["@metadata"]["@collection"])) {
			throw `Document ${payload.id} is part of an unknown collection: "${payload["@metadata"]["@collection"]}"`;
		}

		const ModelClass = DatabaseStore.getModelClassByCollection({
			collection: payload["@metadata"]["@collection"] as Collection,
		});

		return new ModelClass(database, payload) as M;
	}

	hasMetadata(data: IdentifierDataOrMetadata<Model, RavenDBDocumentMetadataContainer>): boolean {
		return "@metadata" in data;
	}

	buildMetadata({ id, collection }: { id: string; collection: Collection }): RavenDBDocumentMetadataContainer {
		return { "@metadata": { "@id": id, "@collection": collection } };
	}
}

export { RavenDBAdapter, RavenDBDocumentSession };
