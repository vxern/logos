import constants from "../../../../../constants/constants";
import { Languages, LearningLanguage, Locale } from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import defaults from "../../../../../defaults";
import { Client } from "../../../../client";
import { DictionaryAdapter } from "../adapter";
import { isSearchMonolingual } from "../adapters";
import {
	DefinitionField,
	DictionaryEntrySource,
	FrequencyField,
	LemmaField,
	MeaningField,
	PartOfSpeechField,
	PronunciationField,
	SyllableField,
	TranslationField,
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

	async fetch(client: Client, lemma: string, _: Languages<LearningLanguage>) {
		let response: Response;
		try {
			response = await fetch(constants.endpoints.wordsApi.word(lemma), {
				headers: {
					"User-Agent": defaults.USER_AGENT,
					"X-RapidAPI-Key": client.environment.rapidApiSecret,
					"X-RapidAPI-Host": constants.endpoints.wordsApi.host,
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

	parse(
		_: Client,
		lemma: string,
		languages: Languages<LearningLanguage>,
		searchResult: SearchResult,
		__: { locale: Locale },
	) {
		const lemmaField: LemmaField = { value: lemma };

		const source: DictionaryEntrySource = {
			link: constants.links.wordsApiLink,
			licence: licences.dictionaries.wordsApi,
		};

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
			const meaningField: MeaningField = { value: definition };
			if (result.synonyms !== undefined && result.synonyms.length !== 0) {
				meaningField.relations = { synonyms: result.synonyms };
			}

			const pronunciationRaw = pronunciation?.[partOfSpeech];
			let pronunciationField: PronunciationField | undefined;
			if (pronunciationRaw !== undefined) {
				pronunciationField = { labels: ["IPA"], value: pronunciationRaw };
			}

			const lastEntry = entries.at(-1);
			if (lastEntry !== undefined) {
				if (lastEntry.partOfSpeech.detected === partOfSpeechDetected || lastEntry.partOfSpeech.value === partOfSpeech) {
					lastEntry.definitions?.push(meaningField);
				}
				continue;
			}

			if (isSearchMonolingual(languages.source, languages.target)) {
				entries.push({
					lemma: lemmaField,
					partOfSpeech: partOfSpeechField,
					definitions: [meaningField],
					translations: undefined as TranslationField[] | undefined,
					syllables: syllableField,
					pronunciation: pronunciationField,
					frequency: frequencyField,
					sources: [source],
				});
			} else {
				entries.push({
					lemma: lemmaField,
					partOfSpeech: partOfSpeechField,
					definitions: undefined as DefinitionField[] | undefined,
					translations: [meaningField],
					syllables: syllableField,
					pronunciation: pronunciationField,
					frequency: frequencyField,
					sources: [source],
				});
			}
		}

		return entries;
	}
}

const adapter = new WordsAPIAdapter();

export default adapter;
