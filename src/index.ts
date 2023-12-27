import * as dotenv from "dotenv";
import * as fs from "fs/promises";
import { Locale, LocalisationLanguage, getLocalisationLanguageByLocale } from "./constants/languages";
import { Client, initialiseClient } from "./lib/client";

async function readDotEnvFile(fileUri: string, isTemplate = false): Promise<Record<string, string> | undefined> {
	const kind = isTemplate ? "environment template" : "environment";

	let contents: string;
	try {
		contents = await fs.readFile(fileUri, { encoding: "utf-8" });
	} catch (error: unknown) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			console.error(`Missing ${kind} file.`);
			if (!isTemplate) {
				return undefined;
			}
		}

		console.error(`Unknown error while reading ${kind} file: ${error}`);

		process.exit(1);
	}

	try {
		return dotenv.parse(contents);
	} catch (error) {
		console.error(`Unknown error while parsing ${kind} file: ${error}`);
		process.exit(1);
	}
}

function readEnvironment({
	envConfiguration,
	templateEnvConfiguration,
}: {
	envConfiguration: Record<string, string> | undefined;
	templateEnvConfiguration: Record<string, string>;
}): void {
	const requiredKeys = Object.keys(templateEnvConfiguration);

	const presentKeys = Object.keys(envConfiguration !== undefined ? envConfiguration : process.env);

	const missingKeys = requiredKeys.filter((requiredKey) => !presentKeys.includes(requiredKey));
	if (missingKeys.length !== 0) {
		throw `Missing one or more required environment variables: ${missingKeys.join(", ")}`;
	}

	if (envConfiguration === undefined) {
		return;
	}

	for (const [key, value] of Object.entries(envConfiguration) as [key: string, value: string][]) {
		process.env[key] = value;
	}
}

const decoder = new TextDecoder();

async function loadLocalisations(directoryPath: string): Promise<Map<string, Map<LocalisationLanguage, string>>> {
	console.info("[Localisations] Loading localisations...");

	const directoryPaths: string[] = [];
	for (const entryPath of await fs.readdir(directoryPath)) {
		const combinedPath = `${directoryPath}/${entryPath}`;
		if (!(await fs.stat(combinedPath)).isDirectory()) {
			continue;
		}

		directoryPaths.push(combinedPath);
	}

	console.info(`[Localisations] Detected ${directoryPaths.length} localisation director(y/ies). Reading...`);

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

					console.warn(`[Localisations] ${language}: '${key}' is not normalised. Normalising...`);

					const valueNormalised = value.toLowerCase().split(" ").join("-").replaceAll("/", "-").replaceAll("'", "-");
					localisations.get(key)?.set(language, valueNormalised);

					continue;
				}

				if (
					key.endsWith(".description") &&
					`${key.replace(/\.description$/, ".name")}` in strings &&
					value.length > 100
				) {
					console.warn(`[Localisations] ${language}: '${key}' is too long (>100 characters). Normalising...`);

					const valueNormalised = value.slice(0, 100);
					localisations.get(key)?.set(language, valueNormalised);

					continue;
				}
			}

			localisations.get(key)?.set(language, value);
		}
	}

	console.info(
		`[Localisations] Loaded ${
			Array.from(localisations.values())
				.flatMap((map) => map.values())
				.flat().length
		} strings.`,
	);

	return localisations;
}

async function setup(): Promise<void> {
	const [envConfiguration, templateEnvConfiguration] = await Promise.all([
		readDotEnvFile(".env"),
		readDotEnvFile(".env.example", true),
	]);

	if (templateEnvConfiguration === undefined) {
		throw "No template environment file found.";
	}

	readEnvironment({ envConfiguration, templateEnvConfiguration });

	const environmentProvisional: Record<keyof Client["environment"], string | boolean | undefined> = {
		discordSecret: process.env.SECRET_DISCORD,
		deeplSecret: process.env.SECRET_DEEPL,
		rapidApiSecret: process.env.SECRET_RAPID_API,
		ravendbHost: process.env.RAVENDB_HOST,
		ravendbDatabase: process.env.RAVENDB_DATABASE,
		ravendbSecure: process.env.RAVENDB_SECURE !== undefined && process.env.RAVENDB_SECURE === "true",
		lavalinkHost: process.env.LAVALINK_HOST,
		lavalinkPort: process.env.LAVALINK_PORT,
		lavalinkPassword: process.env.LAVALINK_PASSWORD,
	};

	for (const [key, value] of Object.entries(environmentProvisional)) {
		if (value === undefined) {
			throw `Value for environment variable '${key}' not provided.`;
		}
	}

	const environment = environmentProvisional as Client["environment"];

	const localisations = await loadLocalisations("./assets/localisations");

	initialiseClient(environment, { rateLimiting: new Map() }, localisations);
}

function customiseGlobals(): void {
	const { info, warn, error } = console;
	console.info = (message, ...params) => {
		return info(`[i] ${message}`, ...params);
	};
	console.warn = (message, ...params) => {
		return warn(`[?] ${message}`, ...params);
	};
	console.error = (message, ...params) => {
		return error(`[!] ${message}`, ...params);
	};
}

customiseGlobals();
setup();
