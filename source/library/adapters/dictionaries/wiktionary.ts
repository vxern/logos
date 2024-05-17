import { type LearningLanguage, type WithBaseLanguage, getFeatureLanguage } from "logos:constants/languages";
import { getPartOfSpeech } from "logos:constants/parts-of-speech";
import { type Definition, DictionaryAdapter, type DictionaryEntry } from "logos/adapters/dictionaries/adapter";
import type { Client } from "logos/client";
import { WiktionaryParser } from "parse-wiktionary";

const newlinesExpression = /\n1/g;

const wiktionary = new WiktionaryParser();

type WordData = ReturnType<(typeof wiktionary)["parse"]> extends Promise<(infer U)[]> ? U : never;

const languageVariantsReduced: Record<string, string> = {
	"English/American": "English",
	"English/British": "English",
	"Norwegian/Bokmål": "Norwegian Bokmål",
	"Armenian/Western": "Armenian",
	"Armenian/Eastern": "Armenian",
} satisfies Record<WithBaseLanguage<LearningLanguage>, string>;

function getReduced(language: LearningLanguage): string {
	return languageVariantsReduced[language] ?? language;
}

class WiktionaryAdapter extends DictionaryAdapter<WordData[]> {
	constructor(client: Client) {
		super(client, {
			identifier: "Wiktionary",
			provides: ["definitions", "etymology"],
			supports: [
				"Armenian/Eastern",
				"Armenian/Western",
				"Danish",
				"Dutch",
				"English/American",
				"English/British",
				"Finnish",
				"French",
				"German",
				"Greek",
				"Hungarian",
				"Norwegian/Bokmål",
				"Polish",
				"Romanian",
				"Russian",
				"Silesian",
				"Spanish",
				"Swedish",
				"Turkish",
			],
		});
	}

	async fetch(lemma: string, learningLanguage: LearningLanguage): Promise<WordData[] | undefined> {
		const data = await wiktionary.parse(lemma, getReduced(learningLanguage));
		if (data.length === 0) {
			// @ts-ignore: Accessing private member.
			const suggestion = wiktionary.document.getElementById("did-you-mean")?.innerText ?? undefined;
			if (suggestion === undefined) {
				return undefined;
			}

			return this.fetch(suggestion, learningLanguage);
		}

		return data;
	}

	parse(_: Logos.Interaction, lemma: string, language: LearningLanguage, results: WordData[]): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];
		for (const result of results) {
			for (const definition of result.definitions) {
				const partOfSpeech = getPartOfSpeech({
					terms: { exact: definition.partOfSpeech, approximate: definition.partOfSpeech },
					learningLanguage: "English/American",
				});
				const [_, ...definitionsRaw] = definition.text as [string, ...string[]];

				const definitions: Definition[] = definitionsRaw.map((definition) => ({ value: definition }));

				entries.push({
					lemma,
					partOfSpeech,
					...(getFeatureLanguage(language) !== "English"
						? { definitions }
						: { nativeDefinitions: definitions }),
					etymologies: [{ value: result.etymology.replaceAll(newlinesExpression, "\n\n") }],
					sources: [
						[
							constants.links.wiktionaryDefinition(lemma, language),
							constants.licences.dictionaries.wiktionary,
						],
					],
				});
			}
		}
		return entries;
	}
}

export { WiktionaryAdapter };
