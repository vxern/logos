import {
	LearningLanguage,
	Locale,
	LocalisationLanguage,
	getLanguageByLocale,
	isLocalised,
} from "./constants/languages";
import { capitalise } from "./formatting";
import { Client, initialiseClient } from "./lib/client";
import { SentencePair } from "./lib/commands/language/commands/game";
import { getSupportedLanguages } from "./lib/commands/language/module";
import * as csv from "csv-parse/sync";
import * as dotenv from "dotenv";
import * as fs from "fs/promises";

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
			const language = getLanguageByLocale(locale);
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
					if (!key.startsWith("parameters.")) {
						const command = key.split(".").at(0) ?? "";
						if (!(`${command}.name` in strings)) {
							localisations.get(key)?.set(language, value);
							continue;
						}
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
					console.warn(`${language}: '${key}' is too long (>100 characters). Normalising...`);

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

/**
 * @returns An array of tuples where the first element is a language and the second
 * element is the contents of its sentence file.
 */
async function readSentenceFiles(directoryPath: string): Promise<[LearningLanguage, string][]> {
	const filePaths: string[] = [];
	for (const entryPath of await fs.readdir(directoryPath)) {
		const combinedPath = `${directoryPath}/${entryPath}`;
		if ((await fs.stat(combinedPath)).isDirectory()) {
			continue;
		}

		filePaths.push(combinedPath);
	}

	const results: Promise<[LearningLanguage, string]>[] = [];
	for (const filePath of filePaths) {
		const [_, fileName] = /^.+\/(.+)\.tsv$/.exec(filePath) ?? [];
		if (fileName === undefined) {
			console.warn(`Sentence file '${filePath}' has an invalid format.`);
			continue;
		}

		const language = fileName
			.split("-")
			.map((part) => capitalise(part))
			.join("/");

		if (!isLocalised(language)) {
			console.warn(
				`File '${filePath}' contains sentences for a language '${language}' not supported by the application. Skipping...`,
			);
			continue;
		}

		results.push(
			fs.readFile(filePath).then((buffer) => {
				const contents = decoder.decode(buffer);
				return [language, contents];
			}),
		);
	}

	return Promise.all(results);
}

/** Loads dictionary adapters and sentence lists. */
function loadSentencePairs(languageFileContents: [LearningLanguage, string][]): Map<LearningLanguage, SentencePair[]> {
	console.info(`[Sentences] Loading sentence pairs for ${languageFileContents.length} language(s)...`);

	const result = new Map<LearningLanguage, SentencePair[]>();

	for (const [language, contents] of languageFileContents) {
		let records;
		try {
			records = csv.parse(contents, { relaxQuotes: true, relaxColumnCount: true, delimiter: "	" }) as
				| [sentenceId: string, sentence: string, translationId: string, translation: string][];
		} catch {
			console.warn(`Failed to load sentences for ${language}.`);
			continue;
		}

		for (const [sentenceId, sentence, translationId, translation] of records) {
			const sentencePair = { sentenceId, sentence, translationId, translation };
			result.get(language)?.push(sentencePair) ?? result.set(language, [sentencePair]);
		}
	}

	console.info(
		`[Sentences] Loaded ${Array.from(result.values()).flat().length} sentence pair(s) spanning ${
			languageFileContents.length
		} language(s).`,
	);

	return result;
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

	const environmentProvisional: Record<keyof Client["metadata"]["environment"], string | undefined> = {
		version: process.env.npm_package_version,
		discordSecret: process.env.SECRET_DISCORD,
		faunaSecret: process.env.SECRET_FAUNA,
		deeplSecret: process.env.SECRET_DEEPL,
		rapidApiSecret: process.env.SECRET_RAPID_API,
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

	const [supportedTranslationLanguages, sentenceFiles] = await Promise.all([
		getSupportedLanguages(environment),
		readSentenceFiles("./assets/sentences"),
	]);

	const sentencePairs = loadSentencePairs(sentenceFiles);
	const localisations = await loadLocalisations("./assets/localisations");

	initialiseClient(
		{ environment, supportedTranslationLanguages },
		{ sentencePairs, rateLimiting: new Map() },
		localisations,
	);
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
