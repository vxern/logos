import { loadEnvironment } from "logos:core/loaders/environment";
import { loadLocalisations } from "logos:core/loaders/localisations";
import { Client } from "logos/client";

const log = process.env.IS_DEBUG === "true" ? constants.loggers.debug : constants.loggers.standard;

const environment = loadEnvironment({ log });
const localisations = await loadLocalisations({ log });

const client = new Client({ log, environment, localisations });
await client.start();
