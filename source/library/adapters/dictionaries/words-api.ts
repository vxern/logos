import type { LearningLanguage } from "logos:constants/languages";
import { getPartOfSpeech } from "logos:constants/parts-of-speech";
import { type Definition, DictionaryAdapter, type DictionaryEntry } from "logos/adapters/dictionaries/adapter";
import type { Client } from "logos/client";

type SearchResult = {
	readonly results: {
		readonly definition: string;
		readonly partOfSpeech: string;
		readonly synonyms?: string[];
		readonly typeof?: string[];
		readonly derivation?: string[];
	}[];
	readonly syllables: {
		readonly count: number;
		readonly list: string[];
	};
	readonly pronunciation: {
		readonly all: string;
	};
};

class WordsAPIAdapter extends DictionaryAdapter<SearchResult> {
	readonly token: string;

	constructor(client: Client, { token }: { token: string }) {
		super(client, {
			identifier: "WordsAPI",
			provides: ["definitions"],
			supports: ["English/American", "English/British"],
			isFallback: true,
		});

		this.token = token;
	}

	static tryCreate(client: Client): WordsAPIAdapter | undefined {
		if (client.environment.rapidApiSecret === undefined) {
			return undefined;
		}

		return new WordsAPIAdapter(client, { token: client.environment.rapidApiSecret });
	}

	async fetch(lemma: string, _: LearningLanguage): Promise<SearchResult | undefined> {
		const response = await fetch(constants.endpoints.wordsApi.word(lemma), {
			headers: {
				"User-Agent": constants.USER_AGENT,
				"X-RapidAPI-Key": this.token,
				"X-RapidAPI-Host": constants.endpoints.wordsApi.host,
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
