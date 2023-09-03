import constants from "../../../../../constants/constants";
import { LearningLanguage, Locale } from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import { Client } from "../../../../client";
import { getPartOfSpeech } from "../../module";
import { Definition, DictionaryAdapter, DictionaryEntry } from "../adapter";

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
	constructor() {
		super({
			name: "WordsAPI",
			provides: ["definitions"],
			isFallback: true,
		});
	}

	async fetch(client: Client, lemma: string, _: LearningLanguage): Promise<SearchResult | undefined> {
		const response = await fetch(constants.endpoints.words.word(lemma), {
			headers: {
				"X-RapidAPI-Key": client.environment.rapidApiSecret,
				"X-RapidAPI-Host": constants.endpoints.words.host,
			},
		});
		if (!response.ok) {
			return undefined;
		}

		const searchResult = (await response.json()) as SearchResult;
		return searchResult;
	}

	parse(
		_: Client,
		lemma: string,
		language: LearningLanguage,
		searchResult: SearchResult,
		__: { locale: Locale },
	): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];
		for (const result of searchResult.results) {
			const partOfSpeech = getPartOfSpeech(result.partOfSpeech, result.partOfSpeech, language);

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
				sources: [[constants.links.wordsAPILink, licences.dictionaries.wordsApi]],
			});
		}
		return entries;
	}
}

const adapter = new WordsAPIAdapter();

export default adapter;
