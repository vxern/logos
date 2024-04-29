import { Collection } from "logos:constants/database";
import { DatabaseAdapter, DocumentQuery, DocumentSession } from "logos/adapters/databases/adapter";
import { IdentifierDataOrMetadata, Model, ModelConventions } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";
import nano from "nano";

class CouchDBAdapter extends DatabaseAdapter {
    readonly #_documents: nano.DocumentScope<unknown>;

    constructor({
        username,
        password,
        host,
        port,
        database,
    }: { username?: string; password?: string; host: string; port: string; database: string }) {
        super();

        let url: string;
        if (username !== undefined) {
            if (password !== undefined) {
                url = `${username}:${password}@${host}:${port}`;
            } else {
                url = `${username}@${host}:${port}`;
            }
        } else {
            url = `${host}:${port}`;
        }

        const server = nano({ url, requestDefaults: { agent: constants.USER_AGENT } });
        this.#_documents = server.db.use(database);
    }

    async start(): Promise<void> {}

    async stop(): Promise<void> {}

    conventionsFor({ model }: { model: Model }): ModelConventions {
        return new CouchDBModelConventions({ model });
    }

    async openSession({ database }: { database: DatabaseStore }): Promise<CouchDBDocumentSession> {
        return new CouchDBDocumentSession({ database, documents: this.#_documents });
    }
}

type CouchDBDocumentMetadata = Pick<nano.DocumentGetResponse, "_id" | "_deleted">;

interface CouchDBDocument extends CouchDBDocumentMetadata {
    [key: string]: unknown;
}

class CouchDBDocumentSession extends DocumentSession {
    readonly #_documents: nano.DocumentScope<unknown>;

    constructor({ database, documents }: { database: DatabaseStore; documents: nano.DocumentScope<unknown> }) {
        super({ database });

        this.#_documents = documents;
    }

    async load<M extends Model>(id: string): Promise<M | undefined> {
        const rawDocument = await this.#_documents.get(id);

        return CouchDBModelConventions.instantiateModel<M>(this.database, rawDocument as CouchDBDocumentMetadata);
    }

    async loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
        const documents: (M | undefined)[] = [];
        const rawDocuments = await this.#_documents.fetch({ keys: ids }, { conflicts: false, include_docs: true });
        for (const rawDocument of Object.values(rawDocuments)) {
            if (rawDocument === null) {
                documents.push(undefined);
                continue;
            }

            documents.push(CouchDBModelConventions.instantiateModel<M>(this.database, rawDocument as CouchDBDocument));
        }

        return documents;
    }

    async store<M extends Model>(document: M): Promise<void> {
        await this.#_documents.insert(document as unknown as nano.IdentifiedDocument);
    }

    query<M extends Model>(_: { collection: Collection }): CouchDBDocumentQuery<M> {
        return new CouchDBDocumentQuery<M>({ documents: this.#_documents, session: this });
    }

    async dispose(): Promise<void> {}
}

class CouchDBDocumentQuery<M extends Model> extends DocumentQuery<M> {
    readonly #_documents: nano.DocumentScope<unknown>;
    readonly #_session: CouchDBDocumentSession;
    readonly #_query: nano.MangoQuery;

    constructor({ documents, session }: { documents: nano.DocumentScope<unknown>; session: CouchDBDocumentSession }) {
        super();

        this.#_documents = documents;
        this.#_session = session;
        this.#_query = { selector: {} };
    }

    whereRegex(property: string, pattern: RegExp): CouchDBDocumentQuery<M> {
        Object.assign(this.#_query.selector, { [property === "id" ? "_id" : property]: { $regex: pattern }});
        return this;
    }

    whereEquals(property: string, value: unknown): CouchDBDocumentQuery<M> {
        Object.assign(this.#_query.selector, { [property === "id" ? "_id" : property]: { $eq: value }});
        return this;
    }

    async execute(): Promise<M[]> {
        const result = await this.#_documents.find(this.#_query);
        const ids = result.docs.map((document) => document._id);
        return await this.#_session.loadMany(ids) as M[];
    }
}

class CouchDBModelConventions extends ModelConventions<CouchDBDocumentMetadata> {
    get id(): string {
        return this.model._id;
    }

    static instantiateModel<M extends Model>(database: DatabaseStore, payload: CouchDBDocument): M {
        const [collection, _] = Model.getDataFromId(payload._id);
        const ModelClass = DatabaseStore.getModelClassByCollection({ collection: collection });

        return new ModelClass(database, payload) as M;
    }

    hasMetadata(data: IdentifierDataOrMetadata<Model, CouchDBDocumentMetadata>): boolean {
        return "_id" in data;
    }

    buildMetadata({ id, collection: _ }: { id: string; collection: Collection }): CouchDBDocumentMetadata {
        return { _id: id };
    }

    markDeleted(): void {
        this.model._deleted = true;
    }
}

export { CouchDBAdapter, CouchDBDocumentSession };
