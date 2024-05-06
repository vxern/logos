import * as fs from "node:fs/promises";
import { Locale, LocalisationLanguage, getLocalisationLanguageByLocale } from "logos:constants/languages";
import { readEnvironment } from "logos:core/environment";
import { Client } from "logos/client";
import winston from "winston";

const decoder = new TextDecoder();

async function loadLocalisations(directoryPath: string): Promise<Map<string, Map<LocalisationLanguage, string>>> {
	winston.info("[Setup/Localisations] Loading localisations...");

	const directoryPaths: string[] = [];
	for (const entryPath of await fs.readdir(directoryPath)) {
		const combinedPath = `${directoryPath}/${entryPath}`;
		if (!(await fs.stat(combinedPath)).isDirectory()) {
			continue;
		}

		directoryPaths.push(combinedPath);
	}

	winston.debug(`[Setup/Localisations] Detected ${directoryPaths.length} localisation director(y/ies). Reading...`);

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

					winston.warn(`[Setup/Localisations] ${language}: '${key}' is not normalised. Normalising...`);

					const valueNormalised = value
						.toLowerCase()
						.split(" ")
						.join("-")
						.replaceAll("/", "-")
						.replaceAll("'", "-");
					localisations.get(key)?.set(language, valueNormalised);

					continue;
				}

				if (
					key.endsWith(".description") &&
					`${key.replace(/\.description$/, ".name")}` in strings &&
					value.length > 100
				) {
					winston.warn(
						`[Setup/Localisations] ${language}: '${key}' is too long (>100 characters). Normalising...`,
					);

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

	winston.info(`[Setup/Localisations] Loaded ${stringCount} strings.`);

	return localisations;
}

async function setup(): Promise<void> {
	winston.info("[Setup] Setting up...");

	const environment = readEnvironment();
	const localisations = await loadLocalisations("./assets/localisations");
	const client = await Client.create({ environment, localisations });

	await client.start();
}

await setup();
