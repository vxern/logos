import { Language } from "../../../../../types.js";
import { Client } from "../../../../client.js";
import { getPartOfSpeech } from "../../module.js";
import { DictionaryAdapter, DictionaryEntry, DictionaryProvisions } from "../adapter.js";
import { WiktionaryParser } from "wiktionary";

const wiktionary = new WiktionaryParser();

type WordData = ReturnType<typeof wiktionary["parse"]> extends Promise<(infer U)[]> ? U : never;

const newlinesExpression = RegExp("\n{1}", "g");

class WiktionaryAdapter extends DictionaryAdapter<WordData[]> {
	readonly name = "Wiktionary";
	readonly supports = ["Armenian", "English", "Polish", "Hungarian", "Romanian"] satisfies Language[];
	readonly provides = ["definitions", "etymology"] satisfies DictionaryProvisions[];

	async fetch(lemma: string, language: Language): Promise<WordData[] | undefined> {
		const data = await wiktionary.parse(lemma, language);
		if (data.length === 0) {
			// @ts-ignore: Accessing private member.
			const suggestion = wiktionary.document.getElementById("did-you-mean")?.innerText ?? undefined;
			if (suggestion === undefined) {
				return undefined;
			}

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
