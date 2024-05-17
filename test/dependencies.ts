import { afterEach, beforeEach } from "bun:test";
import { mockEnvironment } from "logos:test/mocks";
import { DatabaseStore } from "logos/stores/database";

type DependencyProvider<T> = () => T;

function useDatabaseStore(): DependencyProvider<DatabaseStore> {
	let database: DatabaseStore;

	beforeEach(async () => {
		database = await DatabaseStore.create({ environment: mockEnvironment });

		await database.setup({ prefetchDocuments: false });
	});

	afterEach(async () => {
		await database.teardown();
	});

	return () => database;
}

export { useDatabaseStore };
