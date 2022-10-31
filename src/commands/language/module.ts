import { parse as parseCSV } from 'std/encoding/csv.ts';
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
import { capitalise } from '../../formatting.ts';
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

const dictionaryAdaptersByLanguage = loadDictionaryAdapters();

function loadDictionaryAdapters(): Map<Language, DictionaryAdapter[]> {
	const result = new Map<Language, DictionaryAdapter[]>();

	console.info('Loading dictionary adapters...');
	console.time('DICTIONARY ADAPTERS');

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

	console.timeEnd('DICTIONARY ADAPTERS');

	const languageAndAdapterCountTuples = Array.from(result.entries())
		.map<[Language, number]>(
			([language, adapters]) => [language, adapters.length],
		);

	const totalCount = languageAndAdapterCountTuples
		.map(([_language, adapterCount]) => adapterCount)
		.reduce((a, b) => a + b);
	console.info(`Loaded ${totalCount} dictionary adapters:`);

	for (const [language, adapterCount] of languageAndAdapterCountTuples) {
		console.info(`- ${language} - ${adapterCount}`);
	}

	return result;
}

const directory = './src/commands/language/data/sentences';

const sentencePairsByLanguage = await loadSentencePairs();

/** Loads dictionary adapters and sentence lists. */
async function loadSentencePairs(): Promise<Map<Language, SentencePair[]>> {
	const result = new Map<Language, SentencePair[]>();

	console.info('Loading sentence pairs...');
	console.time('SENTENCE PAIRS');

	for (const language of supportedLanguages) {
		result.set(language, []);
	}

	const files = [];
	for await (const fileOrDirectory of Deno.readDir(directory)) {
		if (!fileOrDirectory.isFile) continue;

		files.push(fileOrDirectory);
	}

	const promises = files.map((file) =>
		new Promise<void>((resolve) => {
			const languageName = capitalise(file.name.split('.').at(0)!);

			if (
				!(Array.from<string>(supportedLanguages).includes(languageName))
			) {
				return resolve();
			}

			const language = <Language> languageName;

			Deno.readTextFile(`${directory}/${file.name}`).then(async (contents) => {
				const records = <[string, string, string, string][]> await parseCSV(
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

				resolve();
			});
		})
	);

	await Promise.allSettled(promises);

	console.timeEnd('SENTENCE PAIRS');

	const languageAndPairCountTuples = Array.from(result.entries())
		.map<[Language, number]>(([language, pairs]) => [language, pairs.length]);

	const totalCount = languageAndPairCountTuples
		.map(([_language, pairCount]) => pairCount)
		.reduce((a, b) => a + b);
	console.info(`Loaded ${totalCount} sentence pairs:`);

	for (const [language, pairCount] of languageAndPairCountTuples) {
		console.info(`- ${language} - ${pairCount}`);
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

export { dictionaryAdaptersByLanguage, getSupportedLanguages, sentencePairsByLanguage, resolveToSupportedLanguage };
export type { SupportedLanguage };
export default commands;
