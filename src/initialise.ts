import { capitalise } from "./formatting.js";
import { Client, initialiseClient } from "./lib/client.js";
import { getSupportedLanguages, loadDictionaryAdapters, loadSentencePairs } from "./lib/commands/language/module.js";
import { Language, getLanguageByLocale, supportedLanguages } from "./types.js";
import * as Discord from "discordeno";
import * as dotenv from "dotenv";
import * as fs from "fs/promises";
import * as Sentry from "sentry";

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

async function readLocalisations(directoryPath: string): Promise<Map<string, Map<Language, string>>> {
	const directoryPaths: string[] = [];
	for (const entryPath of await fs.readdir(directoryPath)) {
		const combinedPath = `${directoryPath}/${entryPath}`;
		if (!(await fs.stat(combinedPath)).isDirectory()) {
			continue;
		}

		directoryPaths.push(combinedPath);
	}

	const localisationFiles: [language: Language, path: string, normalise: boolean][] = [];
	for (const directoryPath of directoryPaths) {
		if (!(await fs.stat(directoryPath)).isDirectory()) {
			continue;
		}

		const normalise = directoryPath.endsWith("/commands");

		for (const entryPath of await fs.readdir(directoryPath)) {
			const combinedPath = `${directoryPath}/${entryPath}`;
			if (!(await fs.stat(combinedPath)).isFile()) {
				continue;
			}

			const [locale, _] = entryPath.split(".") as [Discord.Locales, string];
			const language = getLanguageByLocale(locale);
			if (language === undefined) {
				continue;
			}

			localisationFiles.push([language, combinedPath, normalise]);
		}
	}

	const localisations = new Map<string, Map<Language, string>>();
	for (const [language, path, normalise] of localisationFiles) {
		const strings = await fs
			.readFile(path)
			.then((contents) => decoder.decode(contents))
			.then((object) => JSON.parse(object) as Record<string, string>);

		let lastKey: string | undefined = undefined;
		for (const [key, value] of Object.entries(strings)) {
			lastKey = key;

			if (!localisations.has(key)) {
				localisations.set(key, new Map());
			}

			if (normalise) {
				if (
					key.endsWith(".name") &&
					(value.includes(" ") || value.includes("/") || value.includes("'") || value.toLowerCase() !== value)
				) {
					console.warn(`${language}: '${key}' is not normalised. Normalising...`);

					const valueNormalised = value.toLowerCase().split(" ").join("-").replaceAll("/", "-").replaceAll("'", "-");
					localisations.get(key)?.set(language, valueNormalised);

					continue;
				}

				if (key.endsWith(".description") && lastKey.endsWith(".name") && value.length > 100) {
					console.warn(`${language}: '${key}' is too long (>100 characters). Normalising...`);

					const valueNormalised = value.slice(0, 100);
					localisations.get(key)?.set(language, valueNormalised);

					continue;
				}
			}

			localisations.get(key)?.set(language, value);
		}
	}

	return localisations;
}

/**
 * @returns An array of tuples where the first element is a language and the second
 * element is the contents of its sentence file.
 */
async function readSentenceFiles(directoryPath: string): Promise<[Language, string][]> {
	const filePaths: string[] = [];
	for (const entryPath of await fs.readdir(directoryPath)) {
		const combinedPath = `${directoryPath}/${entryPath}`;
		if ((await fs.stat(combinedPath)).isDirectory()) {
			continue;
		}

		filePaths.push(combinedPath);
	}

	const results: Promise<[Language, string]>[] = [];
	for (const filePath of filePaths) {
		const [_, fileName] = /.+\/([a-z]+)\.tsv/.exec(filePath) ?? [];
		if (fileName === undefined) {
			console.warn(`Sentence file '${filePath}' has an invalid name.`);
			continue;
		}

		const language = capitalise(fileName);

		if (!(supportedLanguages as readonly string[]).includes(language)) {
			console.warn(
				`File '${filePath}' contains sentences for a language '${language}' not supported by the application. Skipping...`,
			);
			continue;
		}

		results.push(fs.readFile(filePath).then((contents) => [language as Language, decoder.decode(contents)]));
	}

	return Promise.all(results);
}

async function initialise(): Promise<void> {
	const [envConfiguration, templateEnvConfiguration] = await Promise.all([
		readDotEnvFile(".env"),
		readDotEnvFile(".env.example", true),
	]);

	if (templateEnvConfiguration === undefined) {
		throw "No template environment file found.";
	}

	readEnvironment({ envConfiguration, templateEnvConfiguration });

	const environmentProvisional: Record<keyof Client["metadata"]["environment"], string | undefined> = {
		environment: process.env.ENVIRONMENT,
		version: process.env.npm_package_version,
		discordSecret: process.env.DISCORD_SECRET,
		faunaSecret: process.env.FAUNA_SECRET,
		deeplSecret: process.env.DEEPL_SECRET,
		sentrySecret: process.env.SENTRY_SECRET,
		lavalinkHost: process.env.LAVALINK_HOST,
		lavalinkPort: process.env.LAVALINK_PORT,
		lavalinkPassword: process.env.LAVALINK_PASSWORD,
	};

	for (const [key, value] of Object.entries(environmentProvisional)) {
		if (value === undefined) {
			throw `Value for environment variable '${key}' not provided.`;
		}
	}

	const environment = environmentProvisional as Client["metadata"]["environment"];

	Sentry.init({ dsn: process.env.SENTRY_SECRET, environment: environment.environment });

	console.debug(`Running in ${environment.environment} mode.`);

	const [supportedTranslationLanguages, sentenceFiles] = await Promise.all([
		getSupportedLanguages(environment),
		readSentenceFiles("./assets/sentences"),
	]);

	const dictionaryAdapters = loadDictionaryAdapters();
	const sentencePairs = loadSentencePairs(sentenceFiles);
	const localisations = await readLocalisations("./assets/localisations");

	console.debug(`Translations supported between ${supportedTranslationLanguages.length} languages.`);
	console.debug(`Loaded ${Array.from(sentencePairs.values()).flat().length} sentence pairs.`);
	console.debug(`Loaded ${localisations.size} unique string keys.`);

	initialiseClient(
		{ environment, supportedTranslationLanguages },
		{ dictionaryAdapters, sentencePairs, rateLimiting: new Map() },
		localisations,
	);
}

export { initialise };
