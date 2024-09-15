import { loadEnvironment } from "logos:core/loaders/environment";
import { loadLocalisations } from "logos:core/loaders/localisations";
import { Client } from "logos/client";
import loggers from "logos:constants/loggers.ts";

async function start(): Promise<void> {
	const log = process.env.IS_DEBUG === "true" ? loggers.debug : loggers.standard;

	const environment = loadEnvironment({ log });
	const localisations = await loadLocalisations({ log });

	const client = await Client.create({ log, environment, localisations });
	await client.start();
}

await start();
