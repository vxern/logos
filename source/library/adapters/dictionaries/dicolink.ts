import type { LearningLanguage } from "logos:constants/languages";
import { getPartOfSpeech } from "logos:constants/parts-of-speech";
import { isDefined } from "logos:core/utilities";
import { type Definition, DictionaryAdapter, type DictionaryEntry } from "logos/adapters/dictionaries/adapter";
import type { Client } from "logos/client";

interface DicolinkResult {
	readonly id: string;
	readonly partOfSpeech: string;
	readonly source: string;
	readonly attributionText: string;
	readonly attributionUrl: string;
	readonly word?: string;
	readonly definition: string;
	readonly dicolinkUrl: string;
};

class DicolinkAdapter extends DictionaryAdapter<DicolinkResult[]> {
	static readonly #excludedSources = ["wiktionnaire"];

	readonly token: string;

	constructor(client: Client, { token }: { token: string }) {
		super(client, {
			identifier: "Dicolink",
			provides: ["definitions"],
			supports: ["French"],
		});

		this.token = token;
	}

	static tryCreate(client: Client): DicolinkAdapter | undefined {
		if (client.environment.rapidApiSecret === undefined) {
			return undefined;
		}

		return new DicolinkAdapter(client, { token: client.environment.rapidApiSecret });
	}

	async fetch(lemma: string, _: LearningLanguage): Promise<DicolinkResult[] | undefined> {
		const response = await fetch(
			// 'limite=200' maxes out the number of returned results.
			// 'source=tous' tells Dicolink to fetch entries from all of its available dictionaries.
			`${constants.endpoints.dicolink.definitions(lemma)}?limite=200&source=tous`, {
			headers: {
				"User-Agent": constants.USER_AGENT,
				"X-RapidAPI-Key": this.token,
				"X-RapidAPI-Host": constants.endpoints.dicolink.host,
			},
		});
		if (!response.ok) {
			return undefined;
		}

		const data = (await response.json()) as Record<string, unknown>[];
		const resultsAll = data.map<DicolinkResult>((result: any) => ({
			id: result.id,
			partOfSpeech: result.nature,
			source: result.source,
			attributionText: result.attributionText,
			attributionUrl: result.attributionUrl,
			word: result.mot,
			definition: result.definition,
			dicolinkUrl: result.dicolinkUrl,
		}));

		return resultsAll.filter((result) => isDefined(result.partOfSpeech)) as DicolinkResult[];
	}

	parse(
		_: Logos.Interaction,
		lemma: string,
		learningLanguage: LearningLanguage,
		resultsAll: DicolinkResult[],
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

	#pickResultsFromBestSource(resultsAll: DicolinkResult[]): DicolinkResult[] {
		const sourcesAll = Array.from(new Set(resultsAll.map((result) => result.source)).values());
		const sources = sourcesAll.filter((source) => !DicolinkAdapter.#excludedSources.includes(source));

		const resultsDistributed = resultsAll.reduce((distribution, result) => {
			distribution[result.source]?.push(result);
			return distribution;
		}, Object.fromEntries(sources.map((source) => [source, []])) as Record<string, DicolinkResult[]>);
		return Object.values(resultsDistributed).reduce((a, b) => a.length > b.length ? a : b);
	}
}

export { DicolinkAdapter };
