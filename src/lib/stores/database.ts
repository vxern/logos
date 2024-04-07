import { randomUUID } from "node:crypto";
import { Collection, isValidCollection } from "logos:constants/database";
import { Client } from "logos/client";
import { EntryRequest } from "logos/database/entry-request";
import { Guild } from "logos/database/guild";
import { GuildStats } from "logos/database/guild-stats";
import { Model, RawDocument } from "logos/database/model";
import { Praise } from "logos/database/praise";
import { Report } from "logos/database/report";
import { Resource } from "logos/database/resource";
import { Suggestion } from "logos/database/suggestion";
import { Ticket } from "logos/database/ticket";
import { User } from "logos/database/user";
import { Warning } from "logos/database/warning";
import { Logger } from "logos/logger";
import * as ravendb from "ravendb";

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

	constructor(client: Client, { certificate }: { certificate?: Buffer }) {
		const hostWithPort = `${client.environment.ravendbHost}:${client.environment.ravendbPort}`;
		if (certificate !== undefined) {
			super(hostWithPort, client.environment.ravendbDatabase, { certificate, type: "pfx" });
		} else {
			super(hostWithPort, client.environment.ravendbDatabase);
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

		this.#log = Logger.create({ identifier: "Client/Database", isDebug: client.environment.isDebug });

		this.initialize();
	}

	static getModelClassByCollection({ collection }: { collection: Collection }): { new (data: any): Model } {
		return Database.#_classes[collection];
	}

	async start(): Promise<void> {
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
		if (documents.length === 0) {
			return;
		}

		this.#log.debug(`Caching ${documents.length} document(s)...`);

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
	 * Do not use as this doesn't auto-dispose the session. Use {@link Database.withSession} instead.
	 *
	 * @privateRemarks
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

	async withSession<T>(callback: (session: DocumentSession) => Promise<T>): Promise<T> {
		const session = this.openSession();

		const result = await callback(session);

		session.dispose();

		return result;
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

		if (!isValidCollection(payload["@metadata"]["@collection"])) {
			throw `Document ${payload.id} is part of unknown collection: "${payload["@metadata"]["@collection"]}"`;
		}

		const Class = Database.getModelClassByCollection({ collection: payload["@metadata"]["@collection"] as Collection });

		return new Class(payload) as M;
	}

	async get<M extends Model>(id: string): Promise<M | undefined>;
	async get<M extends Model>(ids: string[]): Promise<(M | undefined)[]>;
	async get<M extends Model>(idOrIds: string | string[]): Promise<M | undefined | (M | undefined)[]> {
		const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
		const result = await this.load(ids);

		const documents: (M | undefined)[] = [];
		for (const documentRaw of Object.values(result) as (RawDocument | null)[]) {
			if (documentRaw === null) {
				documents.push(undefined);
				continue;
			}

			const document = DocumentSession.instantiateModel(documentRaw) as M;

			documents.push(document);
			this.#database.cacheDocument(document);
		}

		if (Array.isArray(idOrIds)) {
			return documents;
		}

		return documents.at(0)!;
	}

	async set<M extends Model>(document: M): Promise<M> {
		await this.store<M>(document, document["@metadata"]["@id"]);

		this.#database.cacheDocument(document);

		return document;
	}

	async remove<M extends Model>(document: M): Promise<void> {
		// We don't call `delete()` here because we don't actually delete from the database.

		this.#database.unloadDocument(document);
	}
}

export { Database, DocumentSession };
