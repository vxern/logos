import { parseArgs } from "node:util";
import { loadEnvironment } from "logos:core/loaders/environment.ts";
import bun from "bun";
import { DatabaseStore } from "logos/stores/database.ts";
import { getAvailableMigrations, migrate, rollback } from "logos:core/runners/migrator.ts";
import { DatabaseMetadata } from "logos/models/database-metadata.ts";

const log = constants.loggers.feedback;

const { values } = parseArgs({
	args: bun.argv,
	options: {
		rollback: {
			type: "boolean",
			short: "b",
		},
		step: {
			type: "string",
		},
	},
	strict: true,
	allowPositionals: true,
});

if (values.step !== undefined && !Number.isSafeInteger(Number(values.step))) {
	log.error(`'${values.step}' is not a valid integer.`);

	process.exit(1);
}

const environment = loadEnvironment({ log: constants.loggers.silent });
const database = await DatabaseStore.create({ log: constants.loggers.silent, environment });
await database.setup({ prefetchDocuments: false });

const availableMigrations = await getAvailableMigrations();
const metadata = await DatabaseMetadata.getOrCreate(database, { migrations: Object.keys(availableMigrations) });

const direction = values.rollback ? "down" : "up";
switch (direction) {
	case "up": {
		await migrate({ log, database, metadata, availableMigrations });
		break;
	}
	case "down": {
		const step = values.step !== undefined ? Number(values.step) : 1;
		await rollback({ log, database, metadata, availableMigrations, step });
		break;
	}
}

process.exit(0);
