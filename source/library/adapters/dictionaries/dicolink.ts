import type { LearningLanguage } from "logos:constants/languages";
import { getPartOfSpeech } from "logos:constants/parts-of-speech";
import { isDefined } from "logos:core/utilities";
import { type Definition, DictionaryAdapter, type DictionaryEntry } from "logos/adapters/dictionaries/adapter";
import type { Client } from "logos/client";

type Result = {
	id: string;
	partOfSpeech: string;
	source: string;
	attributionText: string;
	attributionUrl: string;
	definition: string;
	dicolinkUrl: string;
};

class DicolinkAdapter extends DictionaryAdapter<Result[]> {
	constructor(client: Client) {
		super(client, {
			identifier: "Dicolink",
			provides: ["definitions"],
			supports: ["French"],
		});
	}

	async fetch(lemma: string, _: LearningLanguage): Promise<Result[] | undefined> {
		const response = await fetch(constants.endpoints.dicolink.definitions(lemma), {
			headers: {
				"X-RapidAPI-Key": this.client.environment.rapidApiSecret!,
				"X-RapidAPI-Host": constants.endpoints.dicolink.host,
			},
		});
		if (!response.ok) {
			return undefined;
		}

		const data = (await response.json()) as Record<string, unknown>[];
		const resultsAll = data.map((result: Record<string, unknown>) => ({
			id: result.id,
			partOfSpeech: result.nature ? result.nature : undefined,
			source: result.source,
			attributionText: result.attributionText,
			attributionUrl: result.attributionUrl,
			definition: result.definition,
			dicolinkUrl: result.dicolinkUrl,
		}));

		return resultsAll.filter((result) => isDefined(result.partOfSpeech)) as Result[];
	}

	parse(
		_: Logos.Interaction,
		lemma: string,
		learningLanguage: LearningLanguage,
		resultsAll: Result[],
	): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];

		const sources = resultsAll.map((result) => result.source);
		const resultsDistributed = resultsAll.reduce(
			(distribution, result) => {
				distribution[result.source]?.push(result);
				return distribution;
			},
			Object.fromEntries(sources.map((source) => [source, []])) as Record<string, Result[]>,
		);
		const results = Object.values(resultsDistributed).reduce((a, b) => {
			return a.length > b.length ? a : b;
		});

		for (const result of results) {
			const partOfSpeechTopicWord = result.partOfSpeech.split(" ").at(0) ?? result.partOfSpeech;
			const partOfSpeech = getPartOfSpeech({
				terms: { exact: result.partOfSpeech, approximate: partOfSpeechTopicWord },
				learningLanguage,
			});

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
				sources: [[constants.links.dicolinkDefinition(lemma), constants.licences.dictionaries.dicolink]],
			});
		}
		return entries;
	}
}

export { DicolinkAdapter };
