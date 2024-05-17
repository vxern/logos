import { Collection } from "logos:constants/database";
import { Environment } from "logos:core/loaders/environment";
import { DatabaseAdapter, DocumentConventions } from "logos/adapters/databases/adapter";
import { CouchDBDocumentConventions } from "logos/adapters/databases/couchdb/conventions";
import { CouchDBDocumentMetadata } from "logos/adapters/databases/couchdb/document";
import { CouchDBDocumentSession } from "logos/adapters/databases/couchdb/session";
import { IdentifierDataOrMetadata, Model } from "logos/database/model";
import { Logger } from "logos/logger";
import { DatabaseStore } from "logos/stores/database";
import nano from "nano";

class CouchDBAdapter extends DatabaseAdapter {
	readonly #_documents: nano.DocumentScope<unknown>;

	private constructor({
		environment,
		username,
		password,
		protocol,
		host,
		port,
		database,
	}: {
		environment: Environment;
		username: string;
		password: string;
		protocol?: string;
		host: string;
		port: string;
		database: string;
	}) {
		super({ identifier: "CouchDB", environment });

		protocol = "http";

		let url: string;
		if (username !== undefined) {
			if (password !== undefined) {
				url = `${protocol}://${username}:${password}@${host}:${port}`;
			} else {
				url = `${protocol}://${username}@${host}:${port}`;
			}
		} else {
			url = `${protocol}://${host}:${port}`;
		}

		const server = nano({
			url,
			requestDefaults: { agent: constants.USER_AGENT, headers: { "User-Agent": constants.USER_AGENT } },
		});
		this.#_documents = server.db.use(database);
	}

	static tryCreate({ environment, log }: { environment: Environment; log: Logger }): CouchDBAdapter | undefined {
		if (
			environment.couchdbUsername === undefined ||
			environment.couchdbPassword === undefined ||
			environment.couchdbHost === undefined ||
			environment.couchdbPort === undefined ||
			environment.couchdbDatabase === undefined
		) {
			log.error(
				"One or more of `COUCHDB_USERNAME`, `COUCHDB_PASSWORD`, `COUCHDB_HOST`, `COUCHDB_PORT` or `COUCHDB_DATABASE` have not been provided.",
			);
			return undefined;
		}

		return new CouchDBAdapter({
			environment,
			username: environment.couchdbUsername,
			password: environment.couchdbPassword,
			host: environment.couchdbHost,
			port: environment.couchdbPort,
			database: environment.couchdbDatabase,
		});
	}

	async setup(): Promise<void> {}

	async teardown(): Promise<void> {}

	conventionsFor({
		document,
		data,
		collection,
	}: {
		document: Model;
		data: IdentifierDataOrMetadata<Model, CouchDBDocumentMetadata>;
		collection: Collection;
	}): DocumentConventions {
		return new CouchDBDocumentConventions({ document, data, collection });
	}

	async openSession({
		environment,
		database,
	}: { environment: Environment; database: DatabaseStore }): Promise<CouchDBDocumentSession> {
		return new CouchDBDocumentSession({ environment, database, documents: this.#_documents });
	}
}

export { CouchDBAdapter };
