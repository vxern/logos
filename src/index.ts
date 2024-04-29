import * as fs from "node:fs/promises";
import { Locale, LocalisationLanguage, getLocalisationLanguageByLocale } from "logos:constants/languages";
import { Client, Environment } from "logos/client";

const decoder = new TextDecoder();

async function loadLocalisations(directoryPath: string): Promise<Map<string, Map<LocalisationLanguage, string>>> {
	console.info("[Setup/Localisations] Loading localisations...");

	const directoryPaths: string[] = [];
	for (const entryPath of await fs.readdir(directoryPath)) {
		const combinedPath = `${directoryPath}/${entryPath}`;
		if (!(await fs.stat(combinedPath)).isDirectory()) {
			continue;
		}

		directoryPaths.push(combinedPath);
	}

	console.info(`[Setup/Localisations] Detected ${directoryPaths.length} localisation director(y/ies). Reading...`);

	const localisationFiles: [language: LocalisationLanguage, path: string, normalise: boolean][] = [];
	for (const directoryPath of directoryPaths) {
		if (!(await fs.stat(directoryPath)).isDirectory()) {
			continue;
		}

		const normalise = directoryPath.endsWith("/commands") || directoryPath.endsWith("/parameters");

		for (const entryPath of await fs.readdir(directoryPath)) {
			const combinedPath = `${directoryPath}/${entryPath}`;
			if (!(await fs.stat(combinedPath)).isFile()) {
				continue;
			}

			const [locale, _] = entryPath.split(".") as [Locale, string];
			const language = getLocalisationLanguageByLocale(locale);
			if (language === undefined) {
				continue;
			}

			localisationFiles.push([language, combinedPath, normalise]);
		}
	}

	const localisations = new Map<string, Map<LocalisationLanguage, string>>();
	for (const [language, path, normalise] of localisationFiles) {
		const strings = await fs
			.readFile(path)
			.then((contents) => decoder.decode(contents))
			.then((object) => JSON.parse(object) as Record<string, string>);

		for (const [key, value] of Object.entries(strings)) {
			if (!localisations.has(key)) {
				localisations.set(key, new Map());
			}

			if (normalise) {
				if (
					key.endsWith(".name") &&
					(value.includes(" ") || value.includes("/") || value.includes("'") || value.toLowerCase() !== value)
				) {
					if (!key.startsWith("parameters.") && key.endsWith("message.name")) {
						localisations.get(key)?.set(language, value);
						continue;
					}

					console.warn(`[Setup/Localisations] ${language}: '${key}' is not normalised. Normalising...`);

					const valueNormalised = value.toLowerCase().split(" ").join("-").replaceAll("/", "-").replaceAll("'", "-");
					localisations.get(key)?.set(language, valueNormalised);

					continue;
				}

				if (
					key.endsWith(".description") &&
					`${key.replace(/\.description$/, ".name")}` in strings &&
					value.length > 100
				) {
					console.warn(`[Setup/Localisations] ${language}: '${key}' is too long (>100 characters). Normalising...`);

					const valueNormalised = value.slice(0, 100);
					localisations.get(key)?.set(language, valueNormalised);

					continue;
				}
			}

			localisations.get(key)?.set(language, value);
		}
	}

	const stringCount = Array.from(localisations.values())
		.flatMap((map) => map.values())
		.flat().length;

	console.info(`[Setup/Localisations] Loaded ${stringCount} strings.`);

	return localisations;
}

async function setup(): Promise<void> {
	console.info("[Setup] Setting up...");

	if (process.env.SECRET_DISCORD === undefined) {
		console.error(
			"[Setup] Logos cannot start without a Discord token. " +
				"Make sure you've included one in the environment variables with the key `SECRET_DISCORD`.",
		);
		return;
	}

	const environment: Environment = {
		isDebug: process.env.DEBUG === "true",
		discordSecret: process.env.SECRET_DISCORD,
		deeplSecret: process.env.SECRET_DEEPL,
		rapidApiSecret: process.env.SECRET_RAPID_API,
		databaseSolution: process.env.DATABASE_SOLUTION,
		ravendbHost: process.env.RAVENDB_HOST,
		ravendbPort: process.env.RAVENDB_PORT,
		ravendbDatabase: process.env.RAVENDB_DATABASE,
		ravendbSecure: process.env.RAVENDB_SECURE === "true",
		redisHost: process.env.REDIS_HOST,
		redisPort: process.env.REDIS_PORT,
		redisPassword: process.env.REDIS_PASSWORD,
		lavalinkHost: process.env.LAVALINK_HOST,
		lavalinkPort: process.env.LAVALINK_PORT,
		lavalinkPassword: process.env.LAVALINK_PASSWORD,
	};

	const localisations = await loadLocalisations("./assets/localisations");

	let certificate: Buffer | undefined;
	if (environment.databaseSolution === "ravendb" && environment.ravendbSecure) {
		certificate = await fs.readFile(".cert.pfx");
	}

	const client = await Client.create({ environment, localisations, certificate });

	await client.start();
}

await setup();
