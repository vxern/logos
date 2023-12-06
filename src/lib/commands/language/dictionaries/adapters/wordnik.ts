import constants from "../../../../../constants/constants";
import { Languages, LearningLanguage, Locale } from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import defaults from "../../../../../defaults";
import { Client } from "../../../../client";
import { addParametersToURL } from "../../../../utils";
import { DictionaryAdapter } from "../adapter";
import { DictionaryEntrySource, LemmaField, RelationField, RhymeField } from "../dictionary-entry";

interface Result {
	relationshipType: string;
	words: string[];
}

class WordnikAdapter extends DictionaryAdapter<Result[], "rhymes" | "relations"> {
	constructor() {
		super({
			identifier: "Wordnik",
			provides: new Set(["rhymes", "relations"]),
		});
	}

	async fetch(client: Client, lemma: string, _: Languages<LearningLanguage>) {
		let response: Response;
		try {
			response = await fetch(
				addParametersToURL(constants.endpoints.wordnik.relatedWords(lemma), {
					useCanonical: `${true}`,
					api_key: client.environment.wordnikSecret,
				}),
				{
					headers: {
						"User-Agent": defaults.USER_AGENT,
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

		let data: Result[];
		try {
			data = await response.json();
		} catch (exception) {
			client.log.error(`Reading response data for lemma "${lemma}" to ${this.identifier} failed:`, exception);
			return undefined;
		}

		return data;
	}

	parse(_: Client, lemma: string, __: Languages<LearningLanguage>, results: Result[], ___: { locale: Locale }) {
		const [synonyms, antonyms]: [string[], string[]] = [[], []];
		const rhymes = [];
		for (const result of results) {
			const words = result.words.map((word) => word.toLowerCase());

			switch (result.relationshipType) {
				case "synonym": {
					synonyms.push(...words);
					break;
				}
				case "antonym": {
					antonyms.push(...words);
					break;
				}
				case "rhyme": {
					rhymes.push(...words);
					break;
				}
			}
		}

		let relationField: RelationField | undefined;
		if (synonyms.length !== 0 || antonyms.length !== 0) {
			relationField = {};

			if (synonyms.length !== 0) {
				relationField.synonyms = synonyms;
			}

			if (antonyms.length !== 0) {
				relationField.antonyms = antonyms;
			}
		}

		let rhymeField: RhymeField | undefined;
		if (rhymes.length !== 0) {
			rhymeField = { value: rhymes.join(", ") };
		}

		if (relationField === undefined && rhymeField === undefined) {
			return undefined;
		}

		const lemmaField: LemmaField = { value: lemma };

		const source: DictionaryEntrySource = {
			link: constants.links.generateWordnikDefinitionLink(lemma),
			licence: licences.dictionaries.wordnik,
		};

		const entry = { lemma: lemmaField, relations: relationField, rhymes: rhymeField, sources: [source] };

		return [entry];
	}
}

const adapter = new WordnikAdapter();

export default adapter;
