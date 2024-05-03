import { Collection } from "logos:constants/database";
import { Client } from "logos/client";
import { IdentifierDataOrMetadata, Model, ModelConventions } from "logos/database/model";
import { Logger } from "logos/logger";
import { DatabaseStore } from "logos/stores/database";

abstract class DatabaseAdapter {
	readonly log: Logger;
	readonly client: Client;

	constructor(client: Client, { identifier }: { identifier: string }) {
		this.log = Logger.create({ identifier: `DatabaseAdapter(${identifier})`, isDebug: client.environment.isDebug });
		this.client = client;
	}

	abstract start(): Promise<void>;

	abstract stop(): Promise<void>;

	abstract conventionsFor({
		model,
		data,
		collection,
	}: { model: Model; data: IdentifierDataOrMetadata<Model>; collection: Collection }): ModelConventions;

	abstract openSession({ database }: { database: DatabaseStore }): Promise<DocumentSession>;

	async withSession<T>(
		callback: (session: DocumentSession) => Promise<T>,
		{ database }: { database: DatabaseStore },
	): Promise<T> {
		const session = await this.openSession({ database });

		const result = await callback(session);

		await session.dispose();

		return result;
	}
}

abstract class DocumentSession {
	readonly log: Logger;
	readonly database: DatabaseStore;

	constructor(client: Client, { identifier, database }: { identifier: string; database: DatabaseStore }) {
		this.log = Logger.create({ identifier: `DocumentSession(${identifier})`, isDebug: client.environment.isDebug });
		this.database = database;
	}

	abstract load<M extends Model>(id: string): Promise<M | undefined>;
	async get<M extends Model>(id: string): Promise<M | undefined> {
		const document = await this.load<M>(id);
		if (document === undefined) {
			return undefined;
		}

		this.database.cacheDocument(document);

		return document;
	}

	abstract loadMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]>;
	async getMany<M extends Model>(ids: string[]): Promise<(M | undefined)[]> {
		const results = await this.loadMany<M>(ids);

		const documents: (M | undefined)[] = [];
		for (const document of Object.values(results)) {
			if (document === undefined) {
				documents.push(undefined);
				continue;
			}

			this.database.cacheDocument(document);
			documents.push(document);
		}

		return documents;
	}

	abstract store<M extends Model>(document: M): Promise<void>;
	async set<M extends Model>(document: M): Promise<M> {
		await this.store(document);
		this.database.cacheDocument(document);

		return document;
	}

	async remove<M extends Model>(document: M): Promise<void> {
		// We don't call any methods to delete a document here because we don't actually delete anything from the
		// database; we merely *mark* documents as deleted.

		this.database.unloadDocument(document);
	}

	abstract query<M extends Model>({ collection }: { collection: Collection }): DocumentQuery<M>;

	abstract dispose(): Promise<void>;
}

abstract class DocumentQuery<M extends Model> {
	abstract whereRegex(property: string, pattern: RegExp): DocumentQuery<M>;

	abstract whereEquals(property: string, value: unknown): DocumentQuery<M>;

	abstract execute(): Promise<M[]>;
}

export { DatabaseAdapter, DocumentSession, DocumentQuery };
