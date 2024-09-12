import { parseArgs } from "node:util";
import constants from "logos:constants/constants.ts";
import { loadEnvironment } from "logos:core/loaders/environment.ts";
import bun from "bun";
import { DatabaseMetadata } from "logos/models/database-metadata.ts";
import { DatabaseStore } from "logos/stores/database.ts";
import winston from "winston";

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
	winston.error(`'${values.step}' is not a valid integer.`);
	process.exit(1);
}

const direction = values.rollback ? "down" : "up";
const step = values.step !== undefined ? Number(values.step) : 1;

winston.info("Checking for migrations...");

const environment = loadEnvironment();
const database = await DatabaseStore.create({ environment });
await database.setup({ prefetchDocuments: false });

type AvailableMigrations = Record<string, string>;
async function getAvailableMigrations(): Promise<AvailableMigrations> {
	const migrationFilenames = await Array.fromAsync(new Bun.Glob("*.ts").scan(constants.directories.migrations)).then(
		(filenames) => filenames.toSorted(),
	);

	return Object.fromEntries(migrationFilenames.map((filename) => [filename.split("_").at(0)!, filename]));
}

const availableMigrations = await getAvailableMigrations();
const metadata =
	(await DatabaseMetadata.get(database)) ??
	(await DatabaseMetadata.create(database, { migrations: Object.keys(availableMigrations) }));

type Migration = [migration: string, filename: string];
if (direction === "up") {
	const completeMigrations = new Set(metadata.migrations);
	const migrationsToExecute = Object.entries(availableMigrations).filter(
		(migration) => !completeMigrations.has(migration[0]),
	);
	if (migrationsToExecute.length === 0) {
		winston.info("Migrations up to date!");
		process.exit(0);
	}

	winston.info(`Found ${migrationsToExecute.length} migration(s) to execute.`);

	for (const [migration, filename] of migrationsToExecute) {
		const module: { up(database: DatabaseStore): Promise<void> } = await import(
			`../../../${constants.directories.migrations}/${filename}`
		);

		winston.info(`Executing ${filename}...`);

		try {
			await module.up(database);
		} catch (error) {
			winston.error(`Failed to run migration '${filename}': ${error}`);
			process.exit(1);
		}

		await metadata.update(database, () => {
			metadata.migrations.push(migration);
		});
	}

	winston.info("Migrated!");
} else {
	const migrationsToRollback = metadata.migrations;
	if (migrationsToRollback.length === 0) {
		winston.info("There are no migrations to roll back.");
		process.exit(0);
	}

	winston.info(`Found ${migrationsToRollback.length} migration(s) to roll back.`);

	const migrations = migrationsToRollback
		.map<Migration>((migration) => {
			const filename = availableMigrations[migration];
			if (filename === undefined) {
				winston.error(`Could not find file for migration '${migration}'. Does it exist?`);
				process.exit(1);
			}

			return [migration, filename];
		})
		.toReversed()
		.slice(0, step);

	for (const [_, filename] of migrations) {
		const module: { down(database: DatabaseStore): Promise<void> } = await import(
			`../../../${constants.directories.migrations}/${filename}`
		);

		winston.info(`Rolling back ${filename}...`);

		try {
			await module.down(database);
		} catch (error) {
			winston.error(`Failed to roll back ${filename}: ${error}`);
			process.exit(1);
		}

		await metadata.update(database, () => {
			metadata.migrations.pop();
		});
	}

	winston.info("Rolled back!");
}

process.exit(0);
