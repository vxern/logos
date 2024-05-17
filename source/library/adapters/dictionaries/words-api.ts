import { LearningLanguage } from "logos:constants/languages";
import { getPartOfSpeech } from "logos:constants/parts-of-speech";
import { Definition, DictionaryAdapter, DictionaryEntry } from "logos/adapters/dictionaries/adapter";
import { Client } from "logos/client";

type SearchResult = {
	results: Array<{
		definition: string;
		partOfSpeech: string;
		synonyms?: string[];
		typeof?: string[];
		derivation?: string[];
	}>;
	syllables: {
		count: number;
		list: string[];
	};
	pronunciation: {
		all: string;
	};
};

class WordsAPIAdapter extends DictionaryAdapter<SearchResult> {
	constructor(client: Client) {
		super(client, {
			identifier: "WordsAPI",
			provides: ["definitions"],
			supports: ["English/American", "English/British"],
			isFallback: true,
		});
	}

	async fetch(lemma: string, _: LearningLanguage): Promise<SearchResult | undefined> {
		const response = await fetch(constants.endpoints.words.word(lemma), {
			headers: {
				"X-RapidAPI-Key": this.client.environment.rapidApiSecret!,
				"X-RapidAPI-Host": constants.endpoints.words.host,
			},
		});
		if (!response.ok) {
			return undefined;
		}

		return (await response.json()) as SearchResult;
	}

	parse(
		_: Logos.Interaction,
		lemma: string,
		learningLanguage: LearningLanguage,
		searchResult: SearchResult,
	): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];
		for (const result of searchResult.results) {
			const partOfSpeech = getPartOfSpeech({
				terms: { exact: result.partOfSpeech, approximate: result.partOfSpeech },
				learningLanguage,
			});

			const definition: Definition = { value: result.definition };
			if (result.synonyms !== undefined && result.synonyms.length !== 0) {
				definition.relations = { synonyms: result.synonyms };
			}

			const lastEntry = entries.at(-1);
			if (
				lastEntry !== undefined &&
				(lastEntry.partOfSpeech[0] === partOfSpeech[0] || lastEntry.partOfSpeech[1] === partOfSpeech[1])
			) {
				lastEntry.nativeDefinitions?.push(definition);
				continue;
			}

			entries.push({
				lemma,
				partOfSpeech,
				nativeDefinitions: [definition],
				sources: [[constants.links.wordsAPIDefinition(), constants.licences.dictionaries.wordsApi]],
			});
		}
		return entries;
	}
}

export { WordsAPIAdapter };
