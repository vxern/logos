import { loadEnvironment } from "logos:core/loaders/environment";
import { loadLocalisations } from "logos:core/loaders/localisations";
import { Client } from "logos/client";
import winston from "winston";

async function setup(): Promise<void> {
	winston.info("Starting Logos...");

	const environment = loadEnvironment();
	const localisations = await loadLocalisations({ environment });
	const client = await Client.create({ environment, localisations });

	await client.start();
}

await setup();
