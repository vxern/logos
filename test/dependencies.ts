import { afterEach, beforeEach } from "bun:test";
import { mockEnvironment } from "logos:test/mocks";
import { CacheStore } from "logos/stores/cache";
import { DatabaseStore } from "logos/stores/database";

type DependencyProvider<T> = () => T;

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

export { useDatabaseStore };
