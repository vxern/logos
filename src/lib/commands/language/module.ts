import constants from "../../../constants.js";
import { Language, supportedLanguages } from "../../../types.js";
import { Client } from "../../client.js";
import { addParametersToURL } from "../../utils.js";
import { SentencePair } from "./commands/game.js";
import { DictionaryAdapter } from "./dictionaries/adapter.js";
import dexonline from "./dictionaries/adapters/dexonline.js";
import wiktionary from "./dictionaries/adapters/wiktionary.js";
import partsOfSpeech, { PartOfSpeech } from "./dictionaries/parts-of-speech.js";
import * as csv from "csv-parse/sync";

const dictionaryAdapters: DictionaryAdapter[] = [dexonline, wiktionary];

function loadDictionaryAdapters(): Map<Language, DictionaryAdapter[]> {
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

	return result;
}

/** Loads dictionary adapters and sentence lists. */
function loadSentencePairs(languageFileContents: [Language, string][]): Map<Language, SentencePair[]> {
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
	const response = await fetch(
		addParametersToURL(constants.endpoints.deepl.languages, {
			auth_key: environment.deeplSecret,
			type: "target",
		}),
	);
	if (!response.ok) {
		return [];
	}

	const results = (await response.json().catch(() => [])) as DeepLSupportedLanguage[];

	return results.map((result) => ({
		name: result.name,
		code: result.language,
		supportsFormality: result.supports_formality,
	}));
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
