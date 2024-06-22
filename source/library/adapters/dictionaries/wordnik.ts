import {
	DictionaryAdapter,
	type DictionaryEntry,
	type Relations,
	type Rhymes,
} from "logos/adapters/dictionaries/adapter.ts";
import type { Client } from "logos/client.ts";
import type { LearningLanguage } from "logos:constants/languages.ts";

interface Result {
	readonly relationshipType: string;
	readonly words: string[];
}

class WordnikAdapter extends DictionaryAdapter<Result[]> {
	readonly token: string;

	constructor(client: Client, { token }: { token: string }) {
		super(client, {
			identifier: "Wordnik",
			provides: ["rhymes", "relations"],
			supports: ["English/American", "English/British"],
			isFallback: true,
		});

		this.token = token;
	}

	static tryCreate(client: Client): WordnikAdapter | undefined {
		if (client.environment.wordnikSecret === undefined) {
			return undefined;
		}

		return new WordnikAdapter(client, { token: client.environment.wordnikSecret });
	}

	async fetch(lemma: string, _: LearningLanguage) {
		const response = await fetch(
			`${constants.endpoints.wordnik.relatedWords(lemma)}?useCanonical=true&api_key=${this.token}`,
			{
				headers: {
					"User-Agent": constants.USER_AGENT,
				},
			},
		);
		if (!response.ok) {
			return undefined;
		}

		return (await response.json()) as Result[];
	}

	parse(_: Logos.Interaction, lemma: string, __: LearningLanguage, results: Result[]): DictionaryEntry[] {
		const synonyms: string[] = [];
		const antonyms: string[] = [];
		const rhymes: string[] = [];
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

		let relationField: Relations | undefined;
		if (synonyms.length > 0 || antonyms.length > 0) {
			relationField = {};

			if (synonyms.length > 0) {
				relationField.synonyms = synonyms;
			}

			if (antonyms.length > 0) {
				relationField.antonyms = antonyms;
			}
		}

		let rhymeField: Rhymes | undefined;
		if (rhymes.length > 0) {
			rhymeField = { value: rhymes.join(", ") };
		}

		if (relationField === undefined && rhymeField === undefined) {
			return [];
		}

		return [
			{
				lemma,
				partOfSpeech: ["unknown", "unknown"],
				relations: relationField,
				rhymes: rhymeField,
				sources: [
					[constants.links.generateWordnikDefinitionLink(lemma), constants.licences.dictionaries.wordnik],
				],
			},
		];
	}
}

export { WordnikAdapter };
