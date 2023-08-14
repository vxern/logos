import constants from "../../../../../constants/constants";
import { LearningLanguage, Locale, WithVariants, toFeatureLanguage } from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import { Client } from "../../../../client";
import { getPartOfSpeech } from "../../module";
import { Definition, DictionaryAdapter, DictionaryEntry } from "../adapter";
import { WiktionaryParser } from "wiktionary";

const newlinesExpression = RegExp("\n{1}", "g");

const wiktionary = new WiktionaryParser();

type WordData = ReturnType<typeof wiktionary["parse"]> extends Promise<(infer U)[]> ? U : never;

const languageVariantsReduced: Record<string, string> = {
	"English/American": "English",
	"English/British": "English",
	"Norwegian/Bokmål": "Norwegian Bokmål",
	"Armenian/Western": "Armenian",
	"Armenian/Eastern": "Armenian",
} satisfies Record<WithVariants<LearningLanguage>, string>;

function getReduced(language: LearningLanguage): string {
	return languageVariantsReduced[language] ?? language;
}

class WiktionaryAdapter extends DictionaryAdapter<WordData[]> {
	constructor() {
		super({
			name: "Wiktionary",
			provides: ["definitions", "etymology"],
		});
	}

	async fetch(client: Client, lemma: string, language: LearningLanguage): Promise<WordData[] | undefined> {
		const data = await wiktionary.parse(lemma, getReduced(language));
		if (data.length === 0) {
			// @ts-ignore: Accessing private member.
			const suggestion = wiktionary.document.getElementById("did-you-mean")?.innerText ?? undefined;
			if (suggestion === undefined) {
				return undefined;
			}

			return this.fetch(client, suggestion, language);
		}

		return data;
	}

	parse(
		_: Client,
		lemma: string,
		language: LearningLanguage,
		results: WordData[],
		__: { locale: Locale },
	): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];
		for (const result of results) {
			for (const definition of result.definitions) {
				const partOfSpeech = getPartOfSpeech(definition.partOfSpeech, definition.partOfSpeech, "English/American");
				const [_, ...definitionsRaw] = definition.text as [string, ...string[]];

				const definitions: Definition[] = definitionsRaw.map((definition) => ({ value: definition }));

				entries.push({
					lemma,
					partOfSpeech,
					...(toFeatureLanguage(language) !== "English" ? { definitions } : { nativeDefinitions: definitions }),
					etymologies: [{ value: result.etymology.replaceAll(newlinesExpression, "\n\n") }],
					sources: [
						[constants.links.generateWiktionaryDefinitionLink(lemma, language), licences.dictionaries.wiktionary],
					],
				});
			}
		}
		return entries;
	}
}

const adapter = new WiktionaryAdapter();

export default adapter;
