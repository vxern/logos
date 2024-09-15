import { loadEnvironment } from "logos:core/loaders/environment";
import { loadLocalisations } from "logos:core/loaders/localisations";
import { Client } from "logos/client";
import pino from "pino";

async function start(): Promise<void> {
	const log = createLogger();
	const environment = loadEnvironment({ log });
	const localisations = await loadLocalisations({ log });

	const client = await Client.create({ log, environment, localisations });
	await client.start();
}

function createLogger() {
	const targets: pino.TransportTargetOptions[] = [];

	const isDebug = process.env.IS_DEBUG === "true";
	if (isDebug) {
		targets.push({
			target: "pino-pretty",
			level: "debug",
			options: {
				ignore: "pid,hostname",
			},
		});
		targets.push({
			target: "pino/file",
			level: "debug",
			options: { destination: `${constants.directories.logs}/${constants.DEBUG_LOG_FILENAME}` },
		});
	} else {
		targets.push({
			target: "pino/file",
			level: "info",
			options: { destination: `${constants.directories.logs}/${constants.STANDARD_LOG_FILENAME}` },
		});
	}

	return pino(pino.transport({ targets }));
}

await start();
