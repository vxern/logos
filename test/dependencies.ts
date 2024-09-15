import { afterEach, beforeEach } from "bun:test";
import { silent } from "logos:core/utilities.ts";
import { mockEnvironment } from "logos:test/mocks";
import { DatabaseStore } from "logos/stores/database";

type DependencyProvider<T> = () => T;

function useDatabaseStore(): DependencyProvider<DatabaseStore> {
	let database: DatabaseStore;

	beforeEach(async () => {
		database = await DatabaseStore.create({ log: silent, environment: mockEnvironment });
		await database.setup({ prefetchDocuments: false });
	});

	afterEach(async () => {
		await database.teardown();
	});

	return () => database;
}

export { useDatabaseStore };
