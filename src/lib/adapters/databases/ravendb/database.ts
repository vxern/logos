import fs from "node:fs/promises";
import { Collection } from "logos:constants/database";
import { Environment } from "logos:core/loaders/environment";
import { DatabaseAdapter, DocumentConventions } from "logos/adapters/databases/adapter";
import { RavenDBDocumentConventions } from "logos/adapters/databases/ravendb/conventions";
import { RavenDBDocumentMetadataContainer } from "logos/adapters/databases/ravendb/document";
import { RavenDBDocumentSession } from "logos/adapters/databases/ravendb/session";
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
		return new RavenDBDocumentConventions({ document, data, collection });
	}

	async openSession({
		environment,
		database,
	}: { environment: Environment; database: DatabaseStore }): Promise<RavenDBDocumentSession> {
		const rawSession = this.#_database.openSession();

		return new RavenDBDocumentSession({ environment, database, session: rawSession });
	}
}

export { RavenDBAdapter };
