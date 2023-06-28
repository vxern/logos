import { WiktionaryParser } from "wiktionary";
import { DictionaryAdapter, DictionaryEntry, DictionaryProvisions } from "../adapter.js";
import { getPartOfSpeech } from "../../module.js";
import { Client } from "../../../../client.js";
import { Language } from "../../../../../types.js";

const wiktionary = new WiktionaryParser();

type WordData = ReturnType<typeof wiktionary["parse"]> extends Promise<(infer U)[]> ? U : never;

const newlinesExpression = RegExp("\n{1}", "g");

class WiktionaryAdapter extends DictionaryAdapter<WordData[]> {
	readonly name = "Wiktionary";
	readonly supports = ["Armenian", "English", "Polish", "Hungarian", "Romanian"] as Language[];
	readonly provides = [DictionaryProvisions.Definitions, DictionaryProvisions.Etymology];

	async fetch(lemma: string, language: Language): Promise<WordData[] | undefined> {
		const data = await wiktionary.parse(lemma, language);
		if (data.length === 0) {
			// @ts-ignore: Accessing private member as a work-around.
			const suggestion = wiktionary.dom.getElementById("did-you-mean")?.innerText ?? undefined;
			if (suggestion === undefined) return undefined;

			return this.fetch(suggestion, language);
		}

		return data;
	}

	parse(lemma: string, results: WordData[], _: Client, __: string | undefined): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];
		for (const result of results) {
			for (const definition of result.definitions) {
				const partOfSpeech = getPartOfSpeech(definition.partOfSpeech, definition.partOfSpeech, "English");
				const [_, ...definitions] = definition.text as [string, ...string[]];

				entries.push({
					lemma: lemma,
					title: "title",
					partOfSpeech,
					definitions: definitions.map((definition) => ({ value: definition })),
					etymologies: [{ value: result.etymology.replaceAll(newlinesExpression, "\n\n") }],
				});
			}
		}
		return entries;
	}
}

const adapter = new WiktionaryAdapter();

export default adapter;
