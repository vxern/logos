import { Collection } from "logos:constants/database";
import { DatabaseAdapter, DocumentSession } from "logos/adapters/databases/adapter";
import { InMemoryAdapter } from "logos/adapters/databases/in-memory";
import { RavenDBAdapter } from "logos/adapters/databases/ravendb";
import { Client } from "logos/client";
import { EntryRequest } from "logos/database/entry-request";
import { Guild } from "logos/database/guild";
import { GuildStats } from "logos/database/guild-stats";
import { Model, ModelConstructor } from "logos/database/model";
import { Praise } from "logos/database/praise";
import { Report } from "logos/database/report";
import { Resource } from "logos/database/resource";
import { Suggestion } from "logos/database/suggestion";
import { Ticket } from "logos/database/ticket";
import { User } from "logos/database/user";
import { Warning } from "logos/database/warning";
import { Logger } from "logos/logger";

class DatabaseStore {
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

	static readonly #_classes: Record<Collection, ModelConstructor> = Object.freeze({
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

	readonly #_adapter: DatabaseAdapter;

	get conventionsFor(): DatabaseAdapter["conventionsFor"] {
		return this.#_adapter.conventionsFor.bind(this.#_adapter);
	}

	get withSession(): <T>(callback: (session: DocumentSession) => Promise<T>) => Promise<T> {
		return (callback) => this.#_adapter.withSession(callback, { database: this });
	}

	private constructor(client: Client, { adapter }: { adapter: DatabaseAdapter }) {
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

		this.#log = Logger.create({ identifier: "Client/DatabaseStore", isDebug: client.environment.isDebug });

		this.#_adapter = adapter;
	}

	static create(client: Client, { certificate }: { certificate?: Buffer } = {}): DatabaseStore {
		let adapter: DatabaseAdapter;
		switch (client.environment.databaseSolution) {
			case "ravendb": {
				if (
					client.environment.ravendbHost === undefined ||
					client.environment.ravendbPort === undefined ||
					client.environment.ravendbDatabase === undefined
				) {
					client.log.error(
						"One or more of `RAVENDB_HOST`, `RAVENDB_PORT` or `RAVENDB_DATABASE` have not been provided. Logos will run in memory.",
					);
					adapter = new InMemoryAdapter();
					break;
				}

				adapter = new RavenDBAdapter({
					host: client.environment.ravendbHost,
					port: client.environment.ravendbPort,
					database: client.environment.ravendbDatabase,
					certificate,
				});
				break;
			}
			default: {
				if (client.environment.databaseSolution === undefined) {
					client.log.error(
						"`DATABASE_SOLUTION` was not provided. Logos will run in memory. If this was intentional, explicitly define `DATABASE_SOLUTION` as 'none'.",
					);
				}

				client.log.info("Logos is running in memory. Data will not persist in-between sessions.");

				adapter = new InMemoryAdapter();
				break;
			}
		}

		return new DatabaseStore(client, { adapter });
	}

	static getModelClassByCollection({ collection }: { collection: Collection }): ModelConstructor {
		return DatabaseStore.#_classes[collection];
	}

	async start(): Promise<void> {
		await this.#_adapter.start();

		await this.#prefetchDocuments();
	}

	async stop(): Promise<void> {
		await this.#_adapter.stop();
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
}

export { DatabaseStore };
