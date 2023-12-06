import constants from "../../../../../constants/constants";
import { Languages, LearningLanguage, Locale } from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import defaults from "../../../../../defaults";
import { Client } from "../../../../client";
import { addParametersToURL } from "../../../../utils";
import { DictionaryAdapter } from "../adapter";
import { DefinitionField, DictionaryEntrySource, LemmaField, PartOfSpeechField } from "../dictionary-entry";
import { tryDetectPartOfSpeech } from "../part-of-speech";

interface Result {
	// id: string;
	partOfSpeech: string;
	source: string;
	// attributionText: string;
	// attributionUrl: string;
	// word?: string;
	definition: string;
	// dicolinkUrl: string;
}

class DicolinkAdapter extends DictionaryAdapter<Result[], "part-of-speech" | "definitions"> {
	constructor() {
		super({
			identifier: "Dicolink",
			provides: new Set(["part-of-speech", "definitions"]),
		});
	}

	async fetch(client: Client, lemma: string, _: Languages<LearningLanguage>) {
		let response: Response;
		try {
			response = await fetch(
				addParametersToURL(constants.endpoints.dicolink.definitions(lemma), {
					limite: (200).toString(),
					source: "tous",
				}),
				{
					headers: {
						"User-Agent": defaults.USER_AGENT,
						"X-RapidAPI-Key": client.environment.rapidApiSecret,
						"X-RapidAPI-Host": constants.endpoints.dicolink.host,
					},
				},
			);
		} catch (exception) {
			client.log.error(`The request for lemma "${lemma}" to ${this.identifier} failed:`, exception);
			return undefined;
		}

		if (!response.ok) {
			return undefined;
		}

		let data: Record<string, unknown>[];
		try {
			data = await response.json();
		} catch (exception) {
			client.log.error(`Reading response data for lemma "${lemma}" to ${this.identifier} failed:`, exception);
			return undefined;
		}

		const resultsAll: Result[] = data
			.filter((result) => result.nature)
			.map((result) => ({
				// id: result.id as string,
				partOfSpeech: result.nature as string,
				source: result.source as string,
				// attributionText: result.attributionText as string,
				// attributionUrl: result.attributionUrl as string,
				// word: result.mot as string | undefined,
				definition: result.definition as string,
				// dicolinkUrl: result.dicolinkUrl as string,
			}));
		const results = this.pickResultsFromBestSource(resultsAll);

		return results;
	}

	parse(_: Client, lemma: string, languages: Languages<LearningLanguage>, results: Result[], __: { locale: Locale }) {
		const lemmaField: LemmaField = { value: lemma };

		const source: DictionaryEntrySource = {
			link: constants.links.generateDicolinkDefinitionLink(lemma),
			licence: licences.dictionaries.dicolink,
		};

		const entries = [];

		for (const result of results) {
			const { partOfSpeech, definition } = result;
			const [partOfSpeechFuzzy] = partOfSpeech.split(" ");
			const partOfSpeechDetected = tryDetectPartOfSpeech(
				{ exact: partOfSpeech, approximate: partOfSpeechFuzzy },
				languages.source,
			);

			const partOfSpeechField: PartOfSpeechField = { value: partOfSpeech, detected: partOfSpeechDetected };
			const definitionField: DefinitionField = { value: definition };

			const lastEntry = entries.at(-1);
			if (lastEntry !== undefined) {
				if (lastEntry.partOfSpeech.detected === partOfSpeechDetected || lastEntry.partOfSpeech.value === partOfSpeech) {
					lastEntry.definitions.push(definitionField);
				}
				continue;
			}

			entries.push({
				lemma: lemmaField,
				partOfSpeech: partOfSpeechField,
				definitions: [definitionField],
				sources: [source],
			});
		}

		return entries;
	}

	private pickResultsFromBestSource(resultsAll: Result[]): Result[] {
		const sourcesAll = Array.from(new Set(resultsAll.map((result) => result.source)).values());
		const sources = sourcesAll.filter((source) => !defaults.DICOLINK_REMOVE_SOURCES.includes(source));

		const resultsDistributed = resultsAll.reduce((distribution, result) => {
			distribution[result.source]?.push(result);
			return distribution;
		}, Object.fromEntries(sources.map((source) => [source, []])) as Record<string, Result[]>);
		const results = Object.values(resultsDistributed).reduce((a, b) => {
			return a.length > b.length ? a : b;
		});

		return results;
	}
}

const adapter = new DicolinkAdapter();

export default adapter;
