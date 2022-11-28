import * as csv from 'std/encoding/csv.ts';
import { getLocaleForLanguage, localise, TranslationLanguage, Words } from 'logos/assets/localisations/mod.ts';
import dexonline from 'logos/src/commands/language/data/adapters/dexonline.ts';
import { DictionaryAdapter, SentencePair, WordTypes } from 'logos/src/commands/language/data/types.ts';
import { Client } from 'logos/src/client.ts';
import { addParametersToURL } from 'logos/src/utils.ts';
import { deepLApiEndpoints } from 'logos/constants.ts';
import { Language, supportedLanguages } from 'logos/types.ts';

const dictionaryAdapters: DictionaryAdapter<any>[] = [dexonline];

function loadDictionaryAdapters(): Map<Language, DictionaryAdapter<any>[]> {
	const result = new Map<Language, DictionaryAdapter<any>[]>();

	for (const language of supportedLanguages) {
		result.set(language, []);
	}

	for (const adapter of dictionaryAdapters) {
		for (const language of adapter.supports) {
			result.get(language)!.push(adapter);
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
		const records = <[string, string, string, string][]> csv.parse(
			contents,
			{
				lazyQuotes: true,
				separator: '\t',
			},
		);

		for (
			const [_sentenceID, sentence, _translationID, translation] of records
		) {
			result.get(language)!.push({
				sentence: sentence!,
				translation: translation!,
			});
		}
	}

	return result;
}

interface DeepLSupportedLanguage {
	language: string;
	name: TranslationLanguage;
	'supports_formality': boolean;
}

/** Represents a supported language object sent by DeepL. */
interface SupportedLanguage {
	/** The language name */
	name: TranslationLanguage;

	/** The language code. */
	code: string;

	/** Whether the formality option is supported for this language. */
	supportsFormality: boolean;
}

async function getSupportedLanguages(): Promise<SupportedLanguage[]> {
	const response = await fetch(
		addParametersToURL(deepLApiEndpoints.languages, {
			'auth_key': Deno.env.get('DEEPL_SECRET')!,
			'type': 'target',
		}),
	);
	if (!response.ok) return [];

	const results = <DeepLSupportedLanguage[]> await response.json().catch(
		() => [],
	);

	return results.map((result) => ({
		name: result.name,
		code: result.language,
		supportsFormality: result.supports_formality,
	}));
}

function resolveToSupportedLanguage(
	client: Client,
	languageOrCode: string,
): SupportedLanguage | undefined {
	const languageOrCodeLowercase = languageOrCode.toLowerCase();
	return client.metadata.supportedTranslationLanguages.find((language) =>
		language.code.toLowerCase() === languageOrCodeLowercase ||
		language.name.toLowerCase() === languageOrCode
	);
}

function getWordType(typeString: string, language: Language): WordTypes {
	return localise(Words.typeNameToType, getLocaleForLanguage(language))[typeString] ?? WordTypes.Unknown;
}

export { getSupportedLanguages, getWordType, loadDictionaryAdapters, loadSentencePairs, resolveToSupportedLanguage };
export type { SupportedLanguage };
