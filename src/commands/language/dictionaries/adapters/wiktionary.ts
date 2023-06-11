import { WiktionaryParser } from 'wiktionary';
import { DOMParser } from 'dom';
import {
	DictionaryAdapter,
	DictionaryEntry,
	DictionaryProvisions,
} from 'logos/src/commands/language/dictionaries/adapter.ts';
import { getPartOfSpeech } from 'logos/src/commands/language/module.ts';
import { Client } from 'logos/src/client.ts';
import { Language } from 'logos/types.ts';

const wiktionary = new WiktionaryParser();
// @ts-ignore: Accessing private member as a work-around.
Object.defineProperty(wiktionary, 'document', { get: () => wiktionary.dom });
const dom = new DOMParser();

type WordData = ReturnType<typeof wiktionary['parse']> extends Promise<(infer U)[]> ? U : never;

const newlinesExpression = RegExp('\n{1}', 'g');

class WiktionaryAdapter extends DictionaryAdapter<WordData[]> {
	readonly name = 'Wiktionary';
	readonly supports = ['Armenian', 'Polish', 'Hungarian', 'Romanian'] as Language[];
	readonly provides = [DictionaryProvisions.Definitions, DictionaryProvisions.Etymology];

	async fetch(lemma: string, language: Language): Promise<WordData[] | undefined> {
		// @ts-ignore: Accessing private member as a work-around.
		const html = await wiktionary.download(lemma);
		// @ts-ignore: Accessing private member as a work-around.
		wiktionary.currentWord = lemma;
		// @ts-ignore: Accessing private member as a work-around.
		wiktionary.language = language.toLowerCase();
		// @ts-ignore: Accessing private member as a work-around.
		wiktionary.dom = dom.parseFromString(html, 'text/html');
		// @ts-ignore: Accessing private member as a work-around.
		wiktionary.cleanHTML();
		// @ts-ignore: Accessing private member as a work-around.
		const data = wiktionary.getWordData(wiktionary.language);
		if (data.length === 0) return undefined;

		return data;
	}

	parse(lemma: string, results: WordData[], _: Client, __: string | undefined): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];
		for (const result of results) {
			for (const definition of result.definitions) {
				const partOfSpeech = getPartOfSpeech(definition.partOfSpeech, definition.partOfSpeech, 'English');
				const [_, ...definitions] = definition.text as [string, ...string[]];

				entries.push({
					lemma: lemma,
					title: 'title',
					partOfSpeech,
					definitions: definitions.map((definition) => ({ value: definition })),
					etymologies: [{ value: result.etymology.replaceAll(newlinesExpression, '\n\n') }],
				});
			}
		}
		return entries;
	}
}

const adapter = new WiktionaryAdapter();

export default adapter;
