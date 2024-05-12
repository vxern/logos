import { loadEnvironment } from "logos:core/loaders/environment";
import { loadLocalisations } from "logos:core/loaders/localisations";
import { Client } from "logos/client";

async function setup(): Promise<void> {
	const environment = loadEnvironment();
	const localisations = await loadLocalisations({ environment });
	const client = await Client.create({ environment, localisations });

	await client.start();
}

await setup();
