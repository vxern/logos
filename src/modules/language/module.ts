import { parse as parseCSV } from 'https://deno.land/std@0.127.0/encoding/csv.ts';
import { Client } from '../../client.ts';
import { Command } from '../../commands/structs/command.ts';
import game from './commands/game.ts';
import resources from './commands/resources.ts';
import word from './commands/word.ts';
import translate from './commands/translate.ts';
import article from './commands/article.ts';
import { DictionaryAdapter, DictionaryScope } from './data/dictionary.ts';
import dexonline from './data/dictionaries/dexonline.ts';
import dictionarDeSinonime from './data/dictionaries/dictionar-de-antonime.ts';
import dictionarDeAntonime from './data/dictionaries/dictionar-de-sinonime.ts';
import { SentencePair } from './data/sentence.ts';

const commands: Record<string, Command> = {
	article,
	game,
	resources,
	translate,
	word,
};

const dictionaryAdapters = [
	dexonline,
	dictionarDeAntonime,
	dictionarDeSinonime,
];

const dictionaryAdapterLists: Record<string, DictionaryAdapter[]> = {};
const sentenceLists: Record<string, SentencePair[]> = {};

/** Loads dictionary adapters and sentence lists. */
async function loadComponents(client: Client): Promise<void> {
	for (const language of client.languages.values()) {
		if (language in dictionaryAdapterLists) continue;

		dictionaryAdapterLists[language] = [];
	}

	for (const dictionaryAdapter of dictionaryAdapters) {
		if (dictionaryAdapter.scope === DictionaryScope.OMNILINGUAL) {
			for (const language of Object.keys(dictionaryAdapterLists)) {
				dictionaryAdapterLists[language]!.push(dictionaryAdapter);
			}
			continue;
		}

		for (const language of dictionaryAdapter.languages!) {
			// Ignore unsupported languages.
			if (!(language in dictionaryAdapterLists)) continue;

			dictionaryAdapterLists[language]!.push(dictionaryAdapter);
		}
	}

	for await (
		const entry of Deno.readDir('./src/modules/language/data/sentences')
	) {
		if (!entry.isFile) continue;

		const language = entry.name.split('.')[0]!;

		const records = await parseCSV(
			await Deno.readTextFile(
				`./src/modules/language/data/languages/${entry.name}`,
			),
			{
				lazyQuotes: true,
				separator: '\t',
			},
		) as [string, string, string, string][];

		sentenceLists[language] = [];
		for (
			const [_sentenceID, sentence, _translationID, translation] of records
		) {
			sentenceLists[language]!.push({
				sentence: sentence!,
				translation: translation!,
			});
		}
	}
}

export { dictionaryAdapterLists, loadComponents, sentenceLists };
export default commands;
