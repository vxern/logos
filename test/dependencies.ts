import { afterEach, beforeEach } from "bun:test";
import { type Environment, loadEnvironment } from "logos:core/loaders/environment";
import { mockEnvironment } from "logos:test/mocks";
import { CacheStore } from "logos/stores/cache";
import { DatabaseStore } from "logos/stores/database";

type DependencyProvider<T> = () => T;

function useEnvironment(): DependencyProvider<Environment> {
	let environment: Environment;

	beforeEach(async () => {
		environment = loadEnvironment({ log: constants.loggers.silent });
	});

	return () => environment;
}

function useDatabaseStore(): DependencyProvider<DatabaseStore> {
	let database: DatabaseStore;

	beforeEach(async () => {
		database = DatabaseStore.create({
			log: constants.loggers.silent,
			environment: mockEnvironment,
			cache: new CacheStore({ log: constants.loggers.silent }),
		});
		await database.setup({ prefetchDocuments: false });
	});

	afterEach(async () => {
		await database.teardown();
	});

	return () => database;
}

export { useEnvironment, useDatabaseStore };
