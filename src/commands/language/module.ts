import * as csv from 'std/encoding/csv.ts';
import game from './commands/game.ts';
import resources from './commands/resources.ts';
import word from './commands/word.ts';
import translate from './commands/translate.ts';
import { DictionaryAdapter, DictionaryScopes } from './data/dictionary.ts';
import dexonline from './data/dictionaries/dexonline.ts';
import dictionarDeSinonime from './data/dictionaries/dictionar-de-antonime.ts';
import dictionarDeAntonime from './data/dictionaries/dictionar-de-sinonime.ts';
import { SentencePair } from './data/sentence.ts';
import { Language, supportedLanguages } from '../../types.ts';
import { TranslationLanguage } from '../../../assets/localisations/languages.ts';
import { addParametersToURL } from '../../utils.ts';
import { deepLApiEndpoints } from '../../constants.ts';
import { Client } from '../../client.ts';

const commands = [game, resources, translate, word];

const dictionaryAdapters = [
	dexonline,
	dictionarDeAntonime,
	dictionarDeSinonime,
];

function loadDictionaryAdapters(): Map<Language, DictionaryAdapter[]> {
	const result = new Map<Language, DictionaryAdapter[]>();

	for (const language of supportedLanguages) {
		result.set(language, []);
	}

	for (const adapter of dictionaryAdapters) {
		if (adapter.scope === DictionaryScopes.Omnilingual) {
			for (const adapters of Array.from(result.values())) {
				adapters.push(adapter);
			}
			continue;
		}

		for (const language of adapter.languages) {
			result.get(language)!.push(adapter);
		}
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
	supports_formality: boolean;
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

export { getSupportedLanguages, loadDictionaryAdapters, loadSentencePairs, resolveToSupportedLanguage };
export type { SupportedLanguage };
export default commands;
