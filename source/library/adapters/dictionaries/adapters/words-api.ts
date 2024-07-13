import type { LearningLanguage } from "logos:constants/languages/learning";
import { getPartOfSpeech } from "logos:constants/parts-of-speech";
import { DictionaryAdapter, type DictionaryEntry } from "logos/adapters/dictionaries/adapter";
import type { Client } from "logos/client";

type SearchResult = {
	readonly results: {
		readonly partOfSpeech: string;
		readonly definition: string;
		readonly synonyms?: string[];
		readonly typeof?: string[];
		readonly derivation?: string[];
	}[];
	readonly syllables?: {
		readonly count: number;
		readonly list: string[];
	};
	readonly pronunciation?: Record<string, string> & {
		readonly all: string;
	};
	readonly frequency?: number;
};

class WordsAPIAdapter extends DictionaryAdapter<SearchResult> {
	readonly token: string;

	constructor(client: Client, { token }: { token: string }) {
		super(client, {
			identifier: "WordsAPI",
			provides: ["partOfSpeech", "definitions", "relations", "syllables", "pronunciation", "frequency"],
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
		const { results, pronunciation, syllables, frequency } = searchResult;

		const entries: DictionaryEntry[] = [];
		for (const { partOfSpeech, definition, synonyms } of results) {
			const [partOfSpeechFuzzy] = partOfSpeech.split(" ").reverse();
			const detection = getPartOfSpeech({
				terms: { exact: partOfSpeech, approximate: partOfSpeechFuzzy },
				learningLanguage,
			});

			const lastEntry = entries.at(-1);
			if (lastEntry !== undefined && lastEntry.partOfSpeech !== undefined) {
				if (
					lastEntry.partOfSpeech.detected === detection.detected ||
					lastEntry.partOfSpeech.value === partOfSpeech
				) {
					lastEntry.definitions?.push({ value: definition });
				}
				continue;
			}

			entries.push({
				lemma: { value: lemma },
				partOfSpeech: { value: partOfSpeech, detected: detection.detected },
				definitions: [{ value: definition, relations: { synonyms } }],
				syllables:
					syllables !== undefined
						? { labels: [syllables.count.toString()], value: syllables.list.join("|") }
						: undefined,
				pronunciation:
					pronunciation !== undefined && partOfSpeech in pronunciation
						? { labels: ["IPA"], value: pronunciation[partOfSpeech]! }
						: undefined,
				frequency: frequency !== undefined ? { value: frequency / 5 } : undefined,
				sources: [
					{
						link: constants.links.wordsAPIDefinition(),
						licence: constants.licences.dictionaries.wordsApi,
					},
				],
			});
		}
		return entries;
	}
}

export { WordsAPIAdapter };
