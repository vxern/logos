import * as Wiktionary from "wiktionary-scraper";
import constants from "../../../../../constants/constants";
import { HasVariants, LearningLanguage, Locale, getFeatureLanguage } from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import defaults from "../../../../../defaults";
import { Client } from "../../../../client";
import { DictionaryAdapter, SearchLanguages } from "../adapter";
import {
	// AudioField,
	DefinitionField,
	DictionaryEntrySource,
	EtymologyField,
	LemmaField,
	PartOfSpeechField,
	// PronunciationField,
	// RhymeField,
	TranslationField,
} from "../dictionary-entry";
import { tryDetectPartOfSpeech } from "../part-of-speech";

const languageVariantsReduced: Record<string, string> = {
	"English/American": "English",
	"English/British": "English",
	"Norwegian/Bokmål": "Norwegian Bokmål",
	"Armenian/Western": "Armenian",
	"Armenian/Eastern": "Armenian",
} satisfies Record<HasVariants<LearningLanguage>, string>;

function toWiktionaryLanguage(language: LearningLanguage): string {
	return languageVariantsReduced[language] ?? language;
}

class WiktionaryAdapter extends DictionaryAdapter<
	Wiktionary.Entry[],
	"part-of-speech" | "definitions" | "translations" | "etymology"
> {
	constructor() {
		super({
			identifier: "Wiktionary",
			provides: new Set(["part-of-speech", "definitions", "translations", "etymology"]),
		});
	}

	async fetch(client: Client, lemma: string, languages: SearchLanguages) {
		const targetLanguageWiktionary = toWiktionaryLanguage(languages.target);

		let results: Wiktionary.Entry[] | undefined;
		try {
			results = await Wiktionary.get(lemma, {
				lemmaLanguage: targetLanguageWiktionary,
				userAgent: defaults.USER_AGENT,
			});
		} catch (exception) {
			client.log.error(`The request for lemma "${lemma}" to ${this.identifier} failed:`, exception);
			return undefined;
		}

		if (results === undefined || results.length === 0) {
			return undefined;
		}

		return results;
	}

	parse(_: Client, __: string, languages: SearchLanguages, results: Wiktionary.Entry[], ___: { locale: Locale }) {
		const sourceFeatureLanguage = getFeatureLanguage(languages.source);
		const targetLanguageWiktionary = toWiktionaryLanguage(languages.target);

		const entries = [];

		for (const result of results) {
			const {
				lemma,
				partOfSpeech,
				etymology: etymologyRaw,
				definitions,
				/*
				pronunciations: pronunciationEntries,
			  audioLink: audioLinksRaw,
        */
			} = result;
			if (partOfSpeech === undefined || definitions === undefined) {
				continue;
			}

			const lemmaField: LemmaField = { labels: lemma.labels, value: lemma.value };

			const [partOfSpeechFuzzy, ..._] = partOfSpeech.split(" ").reverse();
			const partOfSpeechDetected = tryDetectPartOfSpeech(
				{ exact: partOfSpeech, approximate: partOfSpeechFuzzy },
				languages.source,
			);

			const etymology = etymologyRaw !== undefined ? etymologyRaw.paragraphs.join("\n\n") : undefined;
			/*
      const audioLinks = audioLinksRaw.filter((audioLink) => audioLink.endsWith(".ogg")).map((link) => `https:${link}`);

			let pronunciationField: PronunciationField | undefined;
			let rhymeField: RhymeField | undefined;
			for (const entry of pronunciationEntries) {
				const models = chunk(entry.split(constants.patterns.wiktionaryPronunciationModels).slice(1), 2);

				for (const [model, content] of models) {
					if (model === undefined || content === undefined) {
						continue;
					}

					switch (model) {
						case "IPA": {
							pronunciationField = { labels: ["IPA"], value: content };
							break;
						}
						case "Rhymes": {
							rhymeField = { value: content };
							break;
						}
					}
				}
			}

			const audioFields: AudioField[] | undefined =
				audioLinks.length !== 0 ? audioLinks.map((audioLink) => ({ value: audioLink })) : undefined;
      */

			const etymologyField: EtymologyField | undefined = etymology !== undefined ? { value: etymology } : undefined;

			for (const entry of definitions) {
				const { fields } = entry;

				const partOfSpeechField: PartOfSpeechField = { value: partOfSpeech, detected: partOfSpeechDetected };

				const source: DictionaryEntrySource = {
					link: constants.links.generateWiktionaryDefinitionLink(lemma.value, targetLanguageWiktionary),
					licence: licences.dictionaries.wiktionary,
				};

				if (sourceFeatureLanguage === "English") {
					const translationFields: TranslationField[] = fields.map((field) => ({ value: field.value }));

					entries.push({
						lemma: lemmaField,
						partOfSpeech: partOfSpeechField,
						definitions: undefined as DefinitionField[] | undefined,
						translations: translationFields,
						// pronunciation: pronunciationField,
						// rhymes: rhymeField,
						// audio: audioFields,
						etymology: etymologyField,
						sources: [source],
					});
				} else {
					const definitionFields: DefinitionField[] = fields.map((field) => ({ value: field.value }));

					entries.push({
						lemma: lemmaField,
						partOfSpeech: partOfSpeechField,
						definitions: definitionFields,
						translations: undefined as TranslationField[] | undefined,
						// pronunciation: pronunciationField,
						// rhymes: rhymeField,
						// audio: audioFields,
						etymology: etymologyField,
						sources: [source],
					});
				}
			}
		}

		return entries;
	}
}

const adapter = new WiktionaryAdapter();

export default adapter;
