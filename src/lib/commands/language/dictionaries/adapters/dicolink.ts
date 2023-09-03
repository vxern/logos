import constants from "../../../../../constants/constants";
import { LearningLanguage, Locale } from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import { Client } from "../../../../client";
import { getPartOfSpeech } from "../../module";
import { Definition, DictionaryAdapter, DictionaryEntry } from "../adapter";

type Result = {
	id: string;
	partOfSpeech: string;
	source: string;
	attributionText: string;
	attributionUrl: string;
	definition: string;
	dicolinkUrl: string;
};

class WordsAPIAdapter extends DictionaryAdapter<Result[]> {
	constructor() {
		super({
			name: "Dicolink",
			provides: ["definitions"],
		});
	}

	async fetch(client: Client, lemma: string, _: LearningLanguage): Promise<Result[] | undefined> {
		const response = await fetch(constants.endpoints.dicolink.definitions(lemma), {
			headers: {
				"X-RapidAPI-Key": client.environment.rapidApiSecret,
				"X-RapidAPI-Host": constants.endpoints.dicolink.host,
			},
		});
		if (!response.ok) {
			return undefined;
		}

		const data = await response.json();
		const resultsAll = data.map((result: Record<string, unknown>) => ({
			id: result.id,
			partOfSpeech: result.nature ? result.nature : undefined,
			source: result.source,
			attributionText: result.attributionText,
			attributionUrl: result.attributionUrl,
			definition: result.definition,
			dicolinkUrl: result.dicolinkUrl,
		}));
		const results = resultsAll.filter(
			(result: Record<string, unknown>) => result.partOfSpeech !== undefined,
		) as Result[];

		return results;
	}

	parse(
		_: Client,
		lemma: string,
		language: LearningLanguage,
		resultsAll: Result[],
		__: { locale: Locale },
	): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];

		const sources = resultsAll.map((result) => result.source);
		const resultsDistributed = resultsAll.reduce((distribution, result) => {
			distribution[result.source]?.push(result);
			return distribution;
		}, Object.fromEntries(sources.map((source) => [source, []])) as Record<string, Result[]>);
		const results = Object.values(resultsDistributed).reduce((a, b) => {
			return a.length > b.length ? a : b;
		});

		for (const result of results) {
			const partOfSpeechTopicWord = result.partOfSpeech.split(" ").at(0) ?? result.partOfSpeech;
			const partOfSpeech = getPartOfSpeech(result.partOfSpeech, partOfSpeechTopicWord, language);

			const definition: Definition = { value: result.definition };

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
				sources: [[constants.links.generateDicolinkDefinitionLink(lemma), licences.dictionaries.dicolink]],
			});
		}
		return entries;
	}
}

const adapter = new WordsAPIAdapter();

export default adapter;
