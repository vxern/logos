import { loadEnvironment } from "logos:core/loaders/environment";
import { loadLocalisations } from "logos:core/loaders/localisations";
import { Client } from "logos/client";

async function start(): Promise<void> {
	const log = process.env.IS_DEBUG === "true" ? constants.loggers.debug : constants.loggers.standard;

	const environment = loadEnvironment({ log });
	const localisations = await loadLocalisations({ log });

	const client = await Client.create({ log, environment, localisations });
	await client.start();
}

await start();
