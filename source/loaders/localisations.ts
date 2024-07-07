import fs from "node:fs/promises";
import {
	type LocalisationLanguage,
	type LogosLocale,
	getLogosLanguageByLocale,
} from "logos:constants/languages/localisation";
import type { Environment } from "logos:core/loaders/environment";
import { Logger } from "logos/logger";

const decoder = new TextDecoder();

async function loadLocalisations({
	environment,
}: { environment: Environment }): Promise<Map<string, Map<LocalisationLanguage, string>>> {
	const log = Logger.create({ identifier: "Loaders/Localisations", isDebug: environment.isDebug });

	log.info("Loading localisations...");

	const directoryPaths: string[] = [];
	for (const entryPath of await fs.readdir(constants.LOCALISATIONS_DIRECTORY)) {
		const combinedPath = `${constants.LOCALISATIONS_DIRECTORY}/${entryPath}`;
		if (!(await fs.stat(combinedPath)).isDirectory()) {
			continue;
		}

		directoryPaths.push(combinedPath);
	}

	log.debug(`Detected ${directoryPaths.length} localisation director(y/ies). Reading...`);

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

			const [locale, _] = entryPath.split(".") as [LogosLocale, string];
			const language = getLogosLanguageByLocale(locale);
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

					log.warn(`${language}: '${key}' is not normalised. Normalising...`);

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
					`${key.replace(constants.patterns.localisationDescription, ".name")}` in strings &&
					value.length > 100
				) {
					log.warn(`${language}: '${key}' is too long (>100 characters). Normalising...`);

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

	log.info(`Loaded ${stringCount} strings.`);

	return localisations;
}

export { loadLocalisations };
