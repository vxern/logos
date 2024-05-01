import { Collection } from "logos:constants/database";
import { DatabaseAdapter, DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
import { Client } from "logos/client";
import { IdentifierDataOrMetadata, Model, ModelConventions } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";
import rethinkdb from "rethinkdb-ts";

class RethinkDBAdapter extends DatabaseAdapter {
    readonly #_connectionOptions: rethinkdb.RConnectionOptions;
    #_connection!: rethinkdb.Connection;

    constructor(
        client: Client,
        {
            username,
            password,
            host,
            port,
            database,
        }: { username?: string; password?: string; host: string; port: string; database: string },
    ) {
        super(client, { identifier: "RethinkDB" });

        this.#_connectionOptions = { host, port: Number(port), db: database, user: username, password };
    }

    async start(): Promise<void> {
        this.#_connection = await rethinkdb.r.connect(this.#_connectionOptions);
        await this.#_createMissingTables();
    }

    async stop(): Promise<void> {
        await this.#_connection.close();
    }

    conventionsFor({ model }: { model: Model }): ModelConventions {
        return new RethinkDBModelConventions({ model });
    }

    async openSession({ database }: { database: DatabaseStore }): Promise<RethinkDBDocumentSession> {
        return new RethinkDBDocumentSession(this.client, { database, connection: this.#_connection });
    }

    async #_createMissingTables(): Promise<void> {
        const tableList = await rethinkdb.r.tableList().run(this.#_connection);

        const queries: rethinkdb.RDatum<rethinkdb.TableChangeResult>[] = [];
        for (const collection of constants.database.collections) {
            if (tableList.includes(collection)) {
                continue;
            }

            queries.push(rethinkdb.r.tableCreate(collection));
        }

        if (queries.length === 0) {
            return;
        }

        await rethinkdb.r.expr(queries).run(this.#_connection);
    }
}

type RethinkDBDocumentMetadata = any;

interface RethinkDBDocument extends RethinkDBDocumentMetadata {
    [key: string]: unknown;
}

class RethinkDBDocumentSession extends DocumentSession {
    readonly #_connection: rethinkdb.Connection;

    constructor(
        client: Client,
        { database, connection }: { database: DatabaseStore; connection: rethinkdb.Connection },
    ) {
        super(client, { identifier: "RethinkDB", database });

        this.#_connection = connection;
    }

    async load<M extends Model>(id: string): Promise<M | undefined> {
        const [collection, partialId] = Model.decomposeId(id);
        // TODO(vxern): What is returned here? Can it be undefined? Does it throw?
        const rawDocument = await rethinkdb.r.get<RethinkDBDocument>(rethinkdb.r.table(collection), partialId).run(this.#_connection);

        return RethinkDBModelConventions.instantiateModel<M>(this.database, rawDocument);
    }

    async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
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

            documents.push(RethinkDBModelConventions.instantiateModel<M>(this.database, rowDocument));
        }

        return documents;
    }

    async store<M extends Model>(document: M): Promise<void> {
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

    query<M extends Model>(_: { collection: Collection }): RethinkDBDocumentQuery<M> {
        return new RethinkDBDocumentQuery<M>({ documents: this.#_documents, session: this });
    }

    async dispose(): Promise<void> {}
}

class RethinkDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
    readonly #_documents: nano.DocumentScope<unknown>;
    readonly #_session: CouchDBDocumentSession;
    readonly #_query: nano.MangoQuery;

    constructor({ documents, session }: { documents: nano.DocumentScope<unknown>; session: CouchDBDocumentSession }) {
        super();

        this.#_documents = documents;
        this.#_session = session;
        this.#_query = { selector: {} };
    }

    whereRegex(property: string, pattern: RegExp): RethinkDBDocumentQuery<M> {
        Object.assign(this.#_query.selector, { [property === "id" ? "_id" : property]: { $regex: pattern.toString() } });
        return this;
    }

    whereEquals(property: string, value: unknown): RethinkDBDocumentQuery<M> {
        Object.assign(this.#_query.selector, { [property === "id" ? "_id" : property]: { $eq: value } });
        return this;
    }

    async execute(): Promise<M[]> {
        const result = await this.#_documents.find(this.#_query);
        const ids = result.docs.map((document) => document._id);
        return (await this.#_session.loadMany(ids)) as M[];
    }
}

class RethinkDBModelConventions extends ModelConventions<RethinkDBDocumentMetadata> {
    get id(): string {
        return this.model._id;
    }

    get revision(): string | undefined {
        return this.model._rev;
    }

    set revision(value: string) {
        this.model._rev = value;
    }

    get isDeleted(): boolean | undefined {
        return this.model._deleted;
    }

    set isDeleted(value: boolean) {
        this.model._deleted = value;
    }

    static instantiateModel<M extends Model>(database: DatabaseStore, payload: RethinkDBDocument): M {
        const [collection, _] = Model.getDataFromId(payload._id);
        const ModelClass = DatabaseStore.getModelClassByCollection({ collection: collection });

        return new ModelClass(database, payload) as M;
    }

    hasMetadata(data: IdentifierDataOrMetadata<Model, RethinkDBDocumentMetadata>): boolean {
        return "_id" in data;
    }

    buildMetadata({ id, collection: _ }: { id: string; collection: Collection }): RethinkDBDocumentMetadata {
        return { _id: id };
    }
}

export { RethinkDBAdapter, RethinkDBDocumentSession };
