import { afterEach, beforeEach } from "bun:test";
import { type Environment, loadEnvironment } from "logos:core/loaders/environment";
import { DiscordConnection } from "logos/connection";
import { CacheStore } from "logos/stores/cache";
import { DatabaseStore } from "logos/stores/database";

type DependencyProvider<T> = () => T;

function createProvider<T>({
	create,
	destroy,
}: {
	create: () => Promise<T> | T;
	destroy?: (object: T) => Promise<void> | void;
}): DependencyProvider<T> {
	let object: T;

	beforeEach(async () => (object = await create()));

	if (destroy !== undefined) {
		afterEach(() => destroy(object));
	}

	return () => object;
}

function createEnvironment(): Environment {
	return loadEnvironment({ log: constants.loggers.silent });
}

function createDatabaseStore(): DatabaseStore {
	return DatabaseStore.create({
		log: constants.loggers.silent,
		environment: createEnvironment(),
		cache: new CacheStore({ log: constants.loggers.silent }),
	});
}

let connection: DiscordConnection;
/**
 * This is the only dependency we do not re-create on every call. It takes at least 5 seconds to establish a connection
 * to Discord, which is definitely not the kind of overhead we want when running tests.
 */
function createDiscordConnection(): DiscordConnection {
	if (connection !== undefined) {
		return connection;
	}

	connection = new DiscordConnection({ environment: loadEnvironment({ log: constants.loggers.silent }) });

	return connection;
}

function useEnvironment(): DependencyProvider<Environment> {
	return createProvider({ create: () => createEnvironment() });
}
function useDatabaseStore(): DependencyProvider<DatabaseStore> {
	return createProvider({
		create: async () => {
			const database = createDatabaseStore();
			await database.setup();

			return database;
		},
		destroy: (database) => database.teardown(),
	});
}
function useDiscordConnection(): DependencyProvider<DiscordConnection> {
	return createProvider({
		create: async () => {
			const connection = createDiscordConnection();
			await connection.open();

			return connection;
		},
		destroy: (connection) => connection.close(),
	});
}

export { useEnvironment, useDatabaseStore, useDiscordConnection };
