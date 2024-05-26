import { type LearningLanguage, getFeatureLanguage } from "logos:constants/languages";
import { getWiktionaryLanguageName } from "logos:constants/languages/learning";
import { getPartOfSpeech } from "logos:constants/parts-of-speech";
import {
	type Definition,
	DictionaryAdapter,
	type DictionaryEntry,
	type Etymology,
} from "logos/adapters/dictionaries/adapter";
import type { Client } from "logos/client";
import * as Wiktionary from "wiktionary-scraper";

class WiktionaryAdapter extends DictionaryAdapter<Wiktionary.Entry[]> {
	constructor(client: Client) {
		super(client, {
			identifier: "Wiktionary",
			provides: ["definitions", "etymology"],
			supports: [
				"Armenian/Eastern",
				"Armenian/Western",
				"Danish",
				"Dutch",
				"English/American",
				"English/British",
				"Finnish",
				"French",
				"German",
				"Greek",
				"Hungarian",
				"Norwegian/Bokmål",
				"Polish",
				"Romanian",
				"Russian",
				"Silesian",
				"Spanish",
				"Swedish",
				"Turkish",
			],
		});
	}

	async fetch(lemma: string, learningLanguage: LearningLanguage): Promise<Wiktionary.Entry[] | undefined> {
		const targetLanguageWiktionary = getWiktionaryLanguageName(learningLanguage);

		let results: Wiktionary.Entry[] | undefined;
		try {
			results = await Wiktionary.get(lemma, {
				lemmaLanguage: targetLanguageWiktionary,
				userAgent: constants.USER_AGENT,
			});
		} catch (exception) {
			this.client.log.error(`The request for lemma "${lemma}" to ${this.identifier} failed:`, exception);
			return undefined;
		}

		if (results === undefined || results.length === 0) {
			return undefined;
		}

		return results;
	}

	parse(
		_: Logos.Interaction,
		lemma: string,
		language: LearningLanguage,
		results: Wiktionary.Entry[],
	): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];
		for (const result of results) {
			if (result.partOfSpeech === undefined || result.definitions === undefined) {
				continue;
			}

			const partOfSpeech = getPartOfSpeech({
				terms: { exact: result.partOfSpeech, approximate: result.partOfSpeech.split(" ").reverse().join(" ") },
				learningLanguage: "English/American",
			});

			const etymologies: Etymology[] | undefined =
				result.etymology !== undefined ? [{ value: result.etymology.paragraphs.join("\n\n") }] : undefined;
			const definitions: Definition[] = result.definitions.flatMap((definition) =>
				definition.fields.map<Definition>((field) => ({ value: field.value })),
			);

			entries.push({
				lemma,
				partOfSpeech,
				...(getFeatureLanguage(language) !== "English" ? { definitions } : { nativeDefinitions: definitions }),
				etymologies,
				sources: [
					[constants.links.wiktionaryDefinition(lemma, language), constants.licences.dictionaries.wiktionary],
				],
			});
		}
		return entries;
	}
}

export { WiktionaryAdapter };
