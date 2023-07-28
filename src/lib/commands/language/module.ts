import constants from "../../../constants/constants";
import { Language, supportedLanguages } from "../../../constants/language";
import { Client } from "../../client";
import { addParametersToURL } from "../../utils";
import { SentencePair } from "./commands/game";
import { DictionaryAdapter } from "./dictionaries/adapter";
import dexonline from "./dictionaries/adapters/dexonline";
import wiktionary from "./dictionaries/adapters/wiktionary";
import partsOfSpeech, { PartOfSpeech } from "./dictionaries/parts-of-speech";
import * as csv from "csv-parse/sync";

const dictionaryAdapters: DictionaryAdapter[] = [dexonline, wiktionary];

function loadDictionaryAdapters(): Map<Language, DictionaryAdapter[]> {
	console.info("[Dictionaries] Loading dictionary adapters...");

	const result = new Map<Language, DictionaryAdapter[]>();

	for (const language of supportedLanguages) {
		result.set(language, []);
	}

	for (const adapter of dictionaryAdapters) {
		for (const language of adapter.supports) {
			result.get(language)?.push(adapter);
		}
	}

	for (const adapters of result.values()) {
		// Sorts adapters in descending order by how much information they provide.
		adapters.sort((a, b) => b.provides.length - a.provides.length);
	}

	console.info(`[Dictionaries] Loaded ${dictionaryAdapters.length} dictionar(y/ies)...`);

	return result;
}

/** Loads dictionary adapters and sentence lists. */
function loadSentencePairs(languageFileContents: [Language, string][]): Map<Language, SentencePair[]> {
	console.info(`[Sentences] Loading sentence pairs for ${languageFileContents.length} language(s)...`);

	const result = new Map<Language, SentencePair[]>();

	for (const language of supportedLanguages) {
		result.set(language, []);
	}

	for (const [language, contents] of languageFileContents) {
		const records = csv.parse(contents, { relaxQuotes: true, delimiter: "	" }) as [
			sentenceId: string,
			sentence: string,
			translationId: string,
			translation: string,
		][];

		for (const [_, sentence, __, translation] of records) {
			result.get(language)?.push({ sentence, translation });
		}
	}

	console.info(
		`[Sentences] Loaded ${Array.from(result.values()).flat().length} sentence pair(s) spanning ${
			languageFileContents.length
		} language(s).`,
	);

	return result;
}

interface DeepLSupportedLanguage {
	language: string;
	name: string;
	supports_formality: boolean;
}

/** Represents a supported language object sent by DeepL. */
interface SupportedLanguage {
	/** The language name */
	name: string;

	/** The language code. */
	code: string;

	/** Whether the formality option is supported for this language. */
	supportsFormality: boolean;
}

async function getSupportedLanguages(environment: Client["metadata"]["environment"]): Promise<SupportedLanguage[]> {
	console.info("[Translations] Getting list of supported translation languages from DeepL...");

	const response = await fetch(
		addParametersToURL(constants.endpoints.deepl.languages, {
			auth_key: environment.deeplSecret,
			type: "target",
		}),
	);
	if (!response.ok) {
		return [];
	}

	const resultsRaw = (await response.json().catch(() => [])) as DeepLSupportedLanguage[];
	const results = resultsRaw.map((result) => ({
		name: result.name,
		code: result.language,
		supportsFormality: result.supports_formality,
	}));

	console.info(`[Translations] List of supported translation languages features ${results.length} language(s).`);

	return results;
}

function resolveToSupportedLanguage(client: Client, languageOrCode: string): SupportedLanguage | undefined {
	const languageOrCodeLowercase = languageOrCode.toLowerCase();
	return client.metadata.supportedTranslationLanguages.find(
		(language) =>
			language.code.toLowerCase() === languageOrCodeLowercase || language.name.toLowerCase() === languageOrCode,
	);
}

function getPartOfSpeech(
	exact: string,
	approximate: string,
	language: Language,
): [detected: PartOfSpeech, original: string] {
	const localised = partsOfSpeech[language];
	if (localised === undefined) {
		return ["unknown", exact];
	}

	const detected = (() => {
		const exactMatch = localised[exact];
		if (exactMatch !== undefined) {
			return exactMatch;
		}

		const approximateMatch = localised[approximate];
		if (approximateMatch !== undefined) {
			return approximateMatch;
		}

		return "unknown";
	})();

	return [detected, exact];
}

export {
	getPartOfSpeech,
	getSupportedLanguages,
	loadDictionaryAdapters,
	loadSentencePairs,
	resolveToSupportedLanguage,
};
export type { SupportedLanguage };
