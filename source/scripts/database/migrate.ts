import { loadEnvironment } from "logos:core/loaders/environment.ts";
import { DatabaseStore } from "logos/stores/database.ts";
import { DatabaseMetadata } from "logos/models/database-metadata.ts";
import constants from "logos:constants/constants.ts";
import winston from "winston";

const environment = loadEnvironment();
const database = await DatabaseStore.create({ environment });

await database.setup({ prefetchDocuments: false });

const migrationFilenames = await Array.fromAsync(new Bun.Glob("*.ts").scan(constants.directories.migrations)).then(
	(filenames) => filenames.toSorted(),
);
const migrationsAvailableWithFilename = migrationFilenames.map<[migration: string, filename: string]>((filename) => [
	filename.split("_").at(0)!,
	filename,
]);

const metadata = await DatabaseMetadata.getOrCreate(database, {
	migrations: migrationsAvailableWithFilename.map((migrationAvailable) => migrationAvailable[0]),
});
const migrationsComplete = new Set(metadata.migrations);

const migrationsLeftToRun = migrationsAvailableWithFilename.filter(
	(migration) => !migrationsComplete.has(migration[1]),
);
if (migrationsLeftToRun.length === 0) {
	winston.info("Migrations up to date.");
	process.exit(0);
}

for (const [migration, filename] of migrationsLeftToRun) {
	const result = await Bun.$`bun run ${filename}`;
	if (result.exitCode !== 0) {
		winston.error(`Failed to run migration '${filename}': ${result.stderr}`);
		process.exit(1);
	}

	await metadata.update(database, () => {
		metadata.migrations.push(migration);
	});
}
