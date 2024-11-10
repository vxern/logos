import type { Collection } from "logos:constants/database";
import type { Environment } from "logos:core/loaders/environment";
import { DatabaseAdapter, type DocumentConventions } from "logos/adapters/databases/adapter";
import { RethinkDBDocumentConventions } from "logos/adapters/databases/rethinkdb/conventions";
import type { RethinkDBDocumentMetadata } from "logos/adapters/databases/rethinkdb/document";
import { RethinkDBDocumentSession } from "logos/adapters/databases/rethinkdb/session";
import type { IdentifierDataOrMetadata, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";
import type pino from "pino";
import rethinkdb from "rethinkdb-ts";

class RethinkDBAdapter extends DatabaseAdapter {
	readonly #connectionOptions: rethinkdb.RConnectionOptions;
	readonly #databaseName: string;
	#connection!: rethinkdb.Connection;

	constructor({
		log,
		username,
		password,
		host,
		port,
		database,
	}: {
		log: pino.Logger;
		username?: string;
		password?: string;
		host: string;
		port: string;
		database: string;
	}) {
		super({ identifier: "RethinkDB", log });

		this.#connectionOptions = { host, port: Number(port), user: username, password, silent: true };
		this.#databaseName = database;
	}

	static tryCreate({
		log,
		environment,
	}: { log: pino.Logger; environment: Environment }): RethinkDBAdapter | undefined {
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
			log,
			username: environment.rethinkdbUsername,
			password: environment.rethinkdbPassword,
			host: environment.rethinkdbHost,
			port: environment.rethinkdbPort,
			database: environment.rethinkdbDatabase,
		});
	}

	async setup(): Promise<void> {
		try {
			this.#connection = await rethinkdb.r.connect(this.#connectionOptions);
		} catch (error: any) {
			this.log.error(error, `Failed to connect to database '${this.#databaseName}'.`);
			throw error;
		}

		const databaseNames = await rethinkdb.r.dbList().run(this.#connection);
		const databaseExists = databaseNames.includes(this.#databaseName);
		if (!databaseExists) {
			this.log.info(`The database '${this.#databaseName}' does not exist. Creating...`);

			try {
				await rethinkdb.r.dbCreate(this.#databaseName).run(this.#connection);
			} catch (error: any) {
				this.log.error(error, `Could not create database '${this.#databaseName}'.`);
				throw error;
			}

			this.log.info(`Created database '${this.#databaseName}'.`);
		}

		this.#connection.use(this.#databaseName);

		await rethinkdb.r.db(this.#databaseName).wait().run(this.#connection);

		await this.#createMissingTables();
	}

	async teardown(): Promise<void> {
		await this.#connection.close();
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

	openSession({ database }: { database: DatabaseStore }): RethinkDBDocumentSession {
		return new RethinkDBDocumentSession({ database, connection: this.#connection });
	}

	async #createMissingTables(): Promise<void> {
		const tableList = await rethinkdb.r.tableList().run(this.#connection);

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

		await rethinkdb.r.expr(queries).run(this.#connection);
	}
}

export { RethinkDBAdapter };
