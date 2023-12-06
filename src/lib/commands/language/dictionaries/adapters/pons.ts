import constants from "../../../../../constants/constants";
import {
	HasVariants,
	Languages,
	Locale,
	PonsLanguage,
	getPonsLocaleByLearningLanguage,
} from "../../../../../constants/languages";
import * as cheerio from "cheerio";
import defaults from "../../../../../defaults";
import { Client } from "../../../../client";
import { addParametersToURL } from "../../../../utils";
import { DictionaryAdapter } from "../adapter";
import {
	DefinitionField,
	DictionaryEntrySource,
	ExampleField,
	ExpressionField,
	LemmaField,
	PartOfSpeechField,
	SyllableField,
	TranslationField,
} from "../dictionary-entry";
import { tryDetectPartOfSpeech } from "../part-of-speech";
import licences from "../../../../../constants/licences";
import { isSearchMonolingual } from "../adapters";

interface SearchResult {
	lang: string;
	hits: DictionaryHit[];
}

interface DictionaryHit {
	type: string;
	opendict: boolean;
	roms: DictionaryEntry[];
}

interface DictionaryEntry {
	headword: string;
	// headword_full: string;
	wordclass: string;
	arabs: {
		header: string;
		translations: {
			source: string;
			target: string;
		}[];
	}[];
}

const UNDERLINE_CHARACTER = "̱";
const SYLLABLE_DIVIDER_CHARACTER = "·";

const languageNames: Record<string, string> = {
	"English/American": "English",
	"English/British": "English",
} satisfies Record<HasVariants<PonsLanguage>, string>;

function toPonsLanguage(language: PonsLanguage): string {
	return (languageNames[language] ?? language).toLowerCase();
}

class PonsAdapter extends DictionaryAdapter<
	DictionaryHit,
	"part-of-speech" | "definitions" | "translations" | "expressions" | "examples"
> {
	constructor() {
		super({
			identifier: "PONS",
			provides: new Set(["part-of-speech", "definitions", "translations", "expressions", "examples"]),
		});
	}

	async fetch(client: Client, lemma: string, languages: Languages<PonsLanguage>) {
		const sourceLocale = getPonsLocaleByLearningLanguage(languages.source);
		const targetLocale = getPonsLocaleByLearningLanguage(languages.target);

		let response: Response;
		try {
			response = await fetch(
				addParametersToURL(constants.endpoints.pons.entries, {
					q: lemma,
					l: `${targetLocale}${sourceLocale}`,
					in: languages.target,
					language: languages.source,
					fm: `${defaults.PONS_FUZZY_MATCH}`,
					ref: `${false}`,
				}),
				{
					headers: {
						"X-Secret": client.environment.ponsSecret,
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

		let results: SearchResult[];
		try {
			results = await response.json();
		} catch (exception) {
			client.log.error(`Reading response data for lemma "${lemma}" to ${this.identifier} failed:`, exception);
			return undefined;
		}

		const result = results.find((result) => result.lang === targetLocale);
		if (result === undefined) {
			return undefined;
		}

		const hit = result.hits.at(0);
		if (hit === undefined) {
			return undefined;
		}

		return hit;
	}

	parse(_: Client, lemma: string, languages: Languages<PonsLanguage>, hit: DictionaryHit, __: { locale: Locale }) {
		const entries = [];

		const sourceLanguageName = toPonsLanguage(languages.source);
		const targetLanguageName = toPonsLanguage(languages.target);

		const source: DictionaryEntrySource = {
			link: constants.links.generatePonsDefinitionLink(lemma, {
				source: sourceLanguageName,
				target: targetLanguageName,
			}),
			licence: licences.dictionaries.pons,
		};

		for (const entry of hit.roms) {
			const { headword: lemmaSyllabisedRaw, wordclass: partOfSpeech, arabs: definitions } = entry;

			const lemma = lemmaSyllabisedRaw.replaceAll(UNDERLINE_CHARACTER, "").replaceAll(SYLLABLE_DIVIDER_CHARACTER, "");
			const lemmaField: LemmaField = { value: lemma };

			const [partOfSpeechFuzzy, ..._] = partOfSpeech.split(" ").reverse();
			const partOfSpeechDetected = tryDetectPartOfSpeech(
				{ exact: partOfSpeech, approximate: partOfSpeechFuzzy },
				languages.source,
			);
			const partOfSpeechField: PartOfSpeechField = { value: partOfSpeech, detected: partOfSpeechDetected };

			const fieldsUnprocessed: DefinitionField[] | TranslationField[] = [];
			for (const definition of definitions) {
				const { header: root, translations: rows } = definition;

				const rootText = cheerio.load(root).text().trim();
				if (rootText.length !== 0 && !constants.patterns.ponsHeader.test(rootText)) {
					continue;
				}

				const header = rows.shift();
				if (header === undefined) {
					continue;
				}

				let value: string;
				if (isSearchMonolingual(languages.source, languages.target)) {
					value = cheerio.load(header.source).text().trim();
				} else {
					value = cheerio.load(header.target).text().trim();
				}
				if (value.length === 0) {
					continue;
				}

				const expressionFields: ExpressionField[] = [];
				const exampleFields: ExampleField[] = [];

				for (const row of rows) {
					const sourceElement = cheerio.load(row.source)("span").first();
					const sourceText = sourceElement.text().trim().split("\n").at(0);
					if (sourceText === undefined) {
						continue;
					}

					let expressionField: ExpressionField | undefined;

					if (!isSearchMonolingual(languages.source, languages.target)) {
						if (sourceElement.hasClass("example")) {
							exampleFields.push({ value: sourceText });
						} else if (sourceElement.hasClass("full_collocation")) {
							expressionFields.push({ value: sourceText });
						}

						const targetElement = cheerio.load(row.target);
						const targetText = targetElement.text().trim().split("\n").at(0);
						if (targetText === undefined) {
							continue;
						}

						expressionField = { value: targetText };
					}

					if (sourceElement.hasClass("example")) {
						exampleFields.push({
							value: sourceText,
							expressions: expressionField !== undefined ? [expressionField] : undefined,
						});
					} else if (sourceElement.hasClass("full_collocation")) {
						expressionFields.push({
							value: sourceText,
							expressions: expressionField !== undefined ? [expressionField] : undefined,
						});
					}
				}

				fieldsUnprocessed.push({
					value,
					expressions: expressionFields,
					examples: exampleFields,
				});
			}

			const meaningFields: DefinitionField[] | TranslationField[] = [];
			for (const field of fieldsUnprocessed) {
				const existentField = meaningFields.find((field_) => field_.value === field.value);
				if (existentField === undefined) {
					meaningFields.push(field);
				} else {
					if (existentField.definitions === undefined) {
						existentField.definitions = field.definitions;
					} else {
						existentField.definitions.push(...(field.definitions ?? []));
					}

					if (existentField.expressions === undefined) {
						existentField.expressions = field.expressions;
					} else {
						existentField.expressions.push(...(field.expressions ?? []));
					}

					if (existentField.examples === undefined) {
						existentField.examples = field.examples;
					} else {
						existentField.examples.push(...(field.examples ?? []));
					}
				}
			}

			if (isSearchMonolingual(languages.source, languages.target)) {
				const syllables = lemmaSyllabisedRaw.split(SYLLABLE_DIVIDER_CHARACTER).map((syllable) => {
					if (!syllable.includes(UNDERLINE_CHARACTER)) {
						return syllable;
					}

					const firstUnderlinedLetterIndex = syllable.indexOf(UNDERLINE_CHARACTER);
					const lastUnderlinedLetterIndex = syllable.lastIndexOf(UNDERLINE_CHARACTER);

					return `${syllable.substring(
						0,
						firstUnderlinedLetterIndex,
					)}__${syllable.substring(
						firstUnderlinedLetterIndex + 1,
						lastUnderlinedLetterIndex,
					)}__${syllable.substring(lastUnderlinedLetterIndex + 1)}`;
				});
				const syllablesFormatted = syllables.join(constants.symbols.word.syllableSeparator);
				const syllableField: SyllableField = { labels: [syllables.length.toString()], value: syllablesFormatted };

				entries.push({
					lemma: lemmaField,
					partOfSpeech: partOfSpeechField,
					definitions: meaningFields,
					translations: undefined as TranslationField[] | undefined,
					syllables: syllableField,
					sources: [source],
				});
			} else {
				entries.push({
					lemma: lemmaField,
					partOfSpeech: partOfSpeechField,
					definitions: undefined as DefinitionField[] | undefined,
					translations: meaningFields,
					sources: [source],
				});
			}
		}

		return entries;
	}
}

const adapter = new PonsAdapter();

export default adapter;
