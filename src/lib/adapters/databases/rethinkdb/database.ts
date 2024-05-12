import { Collection } from "logos:constants/database";
import { Environment } from "logos:core/loaders/environment";
import { DatabaseAdapter, DocumentConventions } from "logos/adapters/databases/adapter";
import { RethinkDBDocumentConventions } from "logos/adapters/databases/rethinkdb/conventions";
import { RethinkDBDocumentMetadata } from "logos/adapters/databases/rethinkdb/document";
import { RethinkDBDocumentSession } from "logos/adapters/databases/rethinkdb/session";
import { IdentifierDataOrMetadata, Model } from "logos/database/model";
import { Logger } from "logos/logger";
import { DatabaseStore } from "logos/stores/database";
import rethinkdb from "rethinkdb-ts";

class RethinkDBAdapter extends DatabaseAdapter {
	readonly #_connectionOptions: rethinkdb.RConnectionOptions;
	#_connection!: rethinkdb.Connection;

	private constructor({
		environment,
		username,
		password,
		host,
		port,
		database,
	}: {
		environment: Environment;
		username?: string;
		password?: string;
		host: string;
		port: string;
		database: string;
	}) {
		super({ environment, identifier: "RethinkDB" });

		this.#_connectionOptions = { host, port: Number(port), db: database, user: username, password };
	}

	static tryCreate({ environment, log }: { environment: Environment; log: Logger }): RethinkDBAdapter | undefined {
		if (
			environment.rethinkdbHost === undefined ||
			environment.rethinkdbPort === undefined ||
			environment.rethinkdbDatabase === undefined
		) {
			log.error(
				"One or more of `RETHINKDB_HOST`, `RETHINKDB_PORT` or `RETHINKDB_DATABASE` have not been provided.",
			);
			return undefined;
		}

		return new RethinkDBAdapter({
			environment,
			username: environment.rethinkdbUsername,
			password: environment.rethinkdbPassword,
			host: environment.rethinkdbHost,
			port: environment.rethinkdbPort,
			database: environment.rethinkdbDatabase,
		});
	}

	async start(): Promise<void> {
		this.#_connection = await rethinkdb.r.connect(this.#_connectionOptions);
		await this.#_createMissingTables();
	}

	async stop(): Promise<void> {
		await this.#_connection.close();
	}

	conventionsFor({
		document,
		data,
		collection,
	}: {
		document: Model;
		data: IdentifierDataOrMetadata<Model, RethinkDBDocumentMetadata>;
		collection: Collection;
	}): DocumentConventions {
		return new RethinkDBDocumentConventions({ document, data, collection });
	}

	async openSession({
		environment,
		database,
	}: { environment: Environment; database: DatabaseStore }): Promise<RethinkDBDocumentSession> {
		return new RethinkDBDocumentSession({ environment, database, connection: this.#_connection });
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

		this.log.info(`Creating missing tables (${queries.length} to create). This may take a moment...`);

		await rethinkdb.r.expr(queries).run(this.#_connection);
	}
}

export { RethinkDBAdapter };
