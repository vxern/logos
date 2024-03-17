import { randomUUID } from "node:crypto";
import * as ravendb from "ravendb";
import { EntryRequest } from "./database/entry-request";
import { Guild } from "./database/guild";
import { GuildStats } from "./database/guild-stats";
import { Collection, Model, RawDocument, isSupportedCollection } from "./database/model";
import { Praise } from "./database/praise";
import { Report } from "./database/report";
import { Resource } from "./database/resource";
import { Suggestion } from "./database/suggestion";
import { Ticket } from "./database/ticket";
import { User } from "./database/user";
import { Warning } from "./database/warning";
import { Logger } from "./logger";

class Database extends ravendb.DocumentStore {
	readonly cache: {
		readonly entryRequests: Map<string, EntryRequest>;
		readonly guildStats: Map<string, GuildStats>;
		readonly guilds: Map<string, Guild>;
		readonly praisesByAuthor: Map<string, Map<string, Praise>>;
		readonly praisesByTarget: Map<string, Map<string, Praise>>;
		readonly reports: Map<string, Report>;
		readonly resources: Map<string, Resource>;
		readonly suggestions: Map<string, Suggestion>;
		readonly tickets: Map<string, Ticket>;
		readonly users: Map<string, User>;
		readonly warningsByTarget: Map<string, Map<string, Warning>>;
	};

	readonly #log: Logger;

	static readonly #_classes: Record<Collection, { new (data: any): Model }> = Object.freeze({
		EntryRequests: EntryRequest,
		GuildStats: GuildStats,
		Guilds: Guild,
		Praises: Praise,
		Reports: Report,
		Resources: Resource,
		Suggestions: Suggestion,
		Tickets: Ticket,
		Users: User,
		Warnings: Warning,
	} as const);

	constructor({
		host,
		database,
		certificate,
		isDebug,
	}: { host: string; database: string; certificate?: Buffer; isDebug?: boolean }) {
		if (certificate !== undefined) {
			super(host, database, { certificate, type: "pfx" });
		} else {
			super(host, database);
		}

		this.cache = {
			entryRequests: new Map(),
			guildStats: new Map(),
			guilds: new Map(),
			praisesByAuthor: new Map(),
			praisesByTarget: new Map(),
			reports: new Map(),
			resources: new Map(),
			suggestions: new Map(),
			tickets: new Map(),
			users: new Map(),
			warningsByTarget: new Map(),
		};

		this.#log = Logger.create({ identifier: "Client/Database", isDebug });
	}

	static getModelClassByCollection({ collection }: { collection: Collection }): { new (data: any): Model } {
		return Database.#_classes[collection];
	}

	async start(): Promise<void> {
		this.initialize();

		await this.#prefetchDocuments();
	}

	stop(): void {
		this.dispose();
	}

	async #prefetchDocuments(): Promise<void> {
		this.#log.info("Prefetching documents...");

		const result = await Promise.all([
			EntryRequest.getAll(this),
			Report.getAll(this),
			Resource.getAll(this),
			Suggestion.getAll(this),
			Ticket.getAll(this),
		]);
		const documents = result.flat();

		this.cacheDocuments(documents);
	}

	cacheDocuments<M extends Model>(documents: M[]): void {
		this.#log.info(`Caching ${documents.length} documents...`);

		for (const document of documents) {
			this.cacheDocument(document);
		}
	}

	cacheDocument(document: any): void {
		switch (true) {
			case document instanceof EntryRequest: {
				this.cache.entryRequests.set(document.partialId, document);
				break;
			}
			case document instanceof GuildStats: {
				this.cache.guildStats.set(document.partialId, document);
				break;
			}
			case document instanceof Guild: {
				this.cache.guilds.set(document.partialId, document);
				break;
			}
			case document instanceof Praise: {
				if (this.cache.praisesByAuthor.has(document.authorId)) {
					this.cache.praisesByAuthor.get(document.authorId)?.set(document.partialId, document);
				} else {
					this.cache.praisesByAuthor.set(document.authorId, new Map([[document.partialId, document]]));
				}

				if (this.cache.praisesByTarget.has(document.targetId)) {
					this.cache.praisesByTarget.get(document.targetId)?.set(document.partialId, document);
				} else {
					this.cache.praisesByTarget.set(document.targetId, new Map([[document.partialId, document]]));
				}

				break;
			}
			case document instanceof Report: {
				this.cache.reports.set(document.partialId, document);
				break;
			}
			case document instanceof Resource: {
				this.cache.resources.set(document.partialId, document);
				break;
			}
			case document instanceof Suggestion: {
				this.cache.suggestions.set(document.partialId, document);
				break;
			}
			case document instanceof Ticket: {
				this.cache.tickets.set(document.partialId, document);
				break;
			}
			case document instanceof User: {
				this.cache.users.set(document.partialId, document);
				break;
			}
			case document instanceof Warning: {
				if (this.cache.warningsByTarget.has(document.targetId)) {
					this.cache.warningsByTarget.get(document.targetId)?.set(document.partialId, document);
				} else {
					this.cache.warningsByTarget.set(document.targetId, new Map([[document.partialId, document]]));
				}
				break;
			}
		}
	}

	unloadDocument(document: any): void {
		switch (true) {
			case document instanceof EntryRequest: {
				this.cache.entryRequests.delete(document.partialId);
				break;
			}
			case document instanceof GuildStats: {
				this.cache.guildStats.delete(document.partialId);
				break;
			}
			case document instanceof Guild: {
				this.cache.guilds.delete(document.partialId);
				break;
			}
			case document instanceof Praise: {
				if (this.cache.praisesByAuthor.has(document.authorId)) {
					this.cache.praisesByAuthor.get(document.authorId)?.delete(document.partialId);
				}

				if (this.cache.praisesByTarget.has(document.targetId)) {
					this.cache.praisesByTarget.get(document.targetId)?.delete(document.partialId);
				}

				break;
			}
			case document instanceof Report: {
				this.cache.reports.delete(document.partialId);
				break;
			}
			case document instanceof Resource: {
				this.cache.resources.delete(document.partialId);
				break;
			}
			case document instanceof Suggestion: {
				this.cache.suggestions.delete(document.partialId);
				break;
			}
			case document instanceof Ticket: {
				this.cache.tickets.delete(document.partialId);
				break;
			}
			case document instanceof User: {
				this.cache.users.delete(document.partialId);
				break;
			}
			case document instanceof Warning: {
				if (this.cache.warningsByTarget.has(document.targetId)) {
					this.cache.warningsByTarget.get(document.targetId)?.delete(document.partialId);
				}
				break;
			}
		}
	}

	/**
	 * @deprecated
	 *
	 * Do not use this because it doesn't auto-dispose the session. Use {@link Database.withSession()} instead.
	 *
	 * @privateRemarks
	 *
	 * This method was reconstructed from the original implementation of the RavenDB `DocumentStore.openSession()`.
	 */
	openSession(): DocumentSession {
		this.assertInitialized();
		this._ensureNotDisposed();

		const session = new DocumentSession({ database: this, id: randomUUID(), options: { noCaching: false } });
		this.registerEvents(session);
		this.emit("sessionCreated", { session });

		return session;
	}

	async withSession(callback: (session: DocumentSession) => Promise<void>): Promise<void> {
		const session = this.openSession();

		await callback(session);

		session.dispose();
	}
}

class DocumentSession extends ravendb.DocumentSession {
	readonly #database: Database;

	constructor({ database, id, options }: { database: Database; id: string; options: ravendb.SessionOptions }) {
		super(database, id, options);

		this.#database = database;

		// ! This logic needs to be turned off as Logos performs model operations and conversions on its own.
		// ! The following line prevents the RavenDB client from trying to convert raw documents to an entity.
		this.entityToJson.convertToEntity = (_, __, document, ____) => document;
	}

	static instantiateModel<M extends Model>(payload: RawDocument): M {
		if (payload["@metadata"]["@collection"] === "@empty") {
			throw `Document ${payload["@metadata"]["@collection"]} is not part of any collection.`;
		}

		if (!isSupportedCollection(payload["@metadata"]["@collection"])) {
			throw `Document ${payload.id} is part of unknown collection: "${payload["@metadata"]["@collection"]}"`;
		}

		const Class = Database.getModelClassByCollection({ collection: payload["@metadata"]["@collection"] as Collection });

		return new Class(payload) as M;
	}

	async get<M extends Model>(id: string): Promise<M | undefined>;
	async get<M extends Model>(ids: string[]): Promise<(M | undefined)[]>;
	async get<M extends Model>(idOrIds: string | string[]): Promise<M | undefined | (M | undefined)[]> {
		const result = (await this.load(Array.isArray(idOrIds) ? idOrIds : [idOrIds])) as Record<
			string,
			RawDocument | null
		>;
		if (result === null) {
			return undefined;
		}

		const documentsRaw = Object.values(result).map((documentRaw) => documentRaw ?? undefined);

		const documents: (M | undefined)[] = [];
		for (const documentRaw of documentsRaw) {
			if ((documentRaw ?? undefined) === undefined) {
				documents.push(undefined);
				continue;
			}

			const document = DocumentSession.instantiateModel(documentRaw!) as M;
			documents.push(document);
		}

		if (Array.isArray(idOrIds)) {
			return documents;
		}

		return documents.at(0)!;
	}

	async set<M extends Model>(document: M): Promise<void> {
		await this.store<M>(document, document["@metadata"]["@id"]);

		this.#database.cacheDocument(document);
	}

	async remove<M extends Model>(document: M): Promise<void> {
		// We don't call `delete()` here because we don't actually delete from the database.

		this.#database.unloadDocument(document);
	}
}

export { Database };
