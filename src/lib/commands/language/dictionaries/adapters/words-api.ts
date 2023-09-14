import constants from "../../../../../constants/constants";
import { Locale } from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import defaults from "../../../../../defaults";
import { Client } from "../../../../client";
import { DictionaryAdapter, SearchLanguages } from "../adapter";
import {
	DefinitionField,
	DictionaryEntrySource,
	FrequencyField,
	LemmaField,
	PartOfSpeechField,
	PronunciationField,
	SyllableField,
} from "../dictionary-entry";
import { tryDetectPartOfSpeech } from "../part-of-speech";

type SearchResult = {
	results: Array<{
		partOfSpeech: string;
		definition: string;
		synonyms?: string[];
		typeof?: string[];
		derivation?: string[];
	}>;
	syllables?: {
		count: number;
		list: string[];
	};
	pronunciation?: Record<string, string>;
	frequency?: number;
};

class WordsAPIAdapter extends DictionaryAdapter<
	SearchResult,
	"part-of-speech" | "definitions" | "relations" | "syllables" | "pronunciation" | "frequency"
> {
	constructor() {
		super({
			identifier: "WordsAPI",
			provides: new Set(["part-of-speech", "definitions", "relations", "syllables", "pronunciation", "frequency"]),
		});
	}

	async fetch(client: Client, lemma: string, _: SearchLanguages) {
		let response: Response;
		try {
			response = await fetch(constants.endpoints.words.word(lemma), {
				headers: {
					"User-Agent": defaults.USER_AGENT,
					"X-RapidAPI-Key": client.environment.rapidApiSecret,
					"X-RapidAPI-Host": constants.endpoints.words.host,
				},
			});
		} catch (exception) {
			client.log.error(`The request for lemma "${lemma}" to ${this.identifier} failed:`, exception);
			return undefined;
		}

		if (!response.ok) {
			return undefined;
		}

		let searchResult: SearchResult;
		try {
			searchResult = await response.json();
		} catch (exception) {
			client.log.error(`Reading response data for lemma "${lemma}" to ${this.identifier} failed:`, exception);
			return undefined;
		}

		return searchResult;
	}

	parse(_: Client, lemma: string, languages: SearchLanguages, searchResult: SearchResult, __: { locale: Locale }) {
		const lemmaField: LemmaField = { value: lemma };

		const { results, pronunciation, syllables, frequency } = searchResult;

		let syllableField: SyllableField | undefined;
		if (syllables !== undefined) {
			syllableField = { labels: [syllables.count.toString()], value: syllables.list.join("|") };
		}

		let frequencyField: FrequencyField | undefined;
		if (frequency !== undefined) {
			frequencyField = { value: frequency / 5 };
		}

		const entries = [];

		for (const result of results) {
			const { partOfSpeech, definition } = result;
			const [partOfSpeechFuzzy] = partOfSpeech.split(" ").reverse();
			const partOfSpeechDetected = tryDetectPartOfSpeech(
				{ exact: partOfSpeech, approximate: partOfSpeechFuzzy },
				languages.source,
			);

			const partOfSpeechField: PartOfSpeechField = { value: partOfSpeech, detected: partOfSpeechDetected };
			const definitionField: DefinitionField = { value: definition };
			if (result.synonyms !== undefined && result.synonyms.length !== 0) {
				definitionField.relations = { synonyms: result.synonyms };
			}

			const pronunciationRaw = pronunciation?.[partOfSpeech];
			let pronunciationField: PronunciationField | undefined;
			if (pronunciationRaw !== undefined) {
				pronunciationField = { labels: ["IPA"], value: pronunciationRaw };
			}

			const source: DictionaryEntrySource = {
				link: constants.links.wordsAPILink,
				licence: licences.dictionaries.wordsApi,
			};

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
				syllables: syllableField,
				pronunciation: pronunciationField,
				frequency: frequencyField,
				sources: [source],
			});
		}

		return entries;
	}
}

const adapter = new WordsAPIAdapter();

export default adapter;
