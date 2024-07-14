import {
	type LearningLanguage,
	type PonsLanguage,
	getPonsLanguageName,
	getPonsLocaleByLanguage,
	isPonsLanguage,
	isSearchMonolingual,
} from "logos:constants/languages/learning.ts";
import { getPartOfSpeech } from "logos:constants/parts-of-speech.ts";
import * as cheerio from "cheerio";
import { DictionaryAdapter, type DictionaryEntry } from "logos/adapters/dictionaries/adapter.ts";
import type {
	DefinitionField,
	ExampleField,
	ExpressionField,
	LemmaField,
	SyllableField,
	TranslationField,
} from "logos/adapters/dictionaries/dictionary-entry.ts";
import type { Client } from "logos/client.ts";

interface PonsResult {
	readonly lang: string;
	readonly hits: PonsDictionaryHit[];
}

interface PonsDictionaryHit {
	readonly type: string;
	readonly opendict: boolean;
	readonly roms: PonsDictionaryEntry[];
}

interface PonsDictionaryEntry {
	readonly headword: string;
	readonly headword_full: string;
	readonly wordclass: string;
	readonly arabs: PonsDefinition[];
}

interface PonsDefinition {
	readonly header: string;
	readonly translations: PonsTranslation[];
}

interface PonsTranslation {
	readonly source: string;
	readonly target: string;
}

class PonsAdapter extends DictionaryAdapter<PonsDictionaryHit> {
	static readonly #underline = "̱";
	static readonly #syllableDivider = "·";

	readonly token: string;

	constructor(client: Client, { token }: { token: string }) {
		super(client, {
			identifier: "PONS",
			provides: ["partOfSpeech", "definitions", "translations", "expressions", "examples"],
			supports: ["German"],
			isFallback: true,
		});
		this.token = token;
	}

	static tryCreate(client: Client): PonsAdapter | undefined {
		if (client.environment.ponsSecret === undefined) {
			return undefined;
		}

		return new PonsAdapter(client, { token: client.environment.ponsSecret });
	}

	async fetch(lemma: string, learningLanguage: LearningLanguage): Promise<PonsDictionaryHit | undefined> {
		if (!isPonsLanguage(learningLanguage)) {
			return undefined;
		}

		const sourceLocale = getPonsLocaleByLanguage(constants.defaults.LEARNING_LANGUAGE);
		const targetLocale = getPonsLocaleByLanguage(learningLanguage);

		const response = await fetch(
			`${constants.endpoints.pons.entries}?q=${lemma}&l=${targetLocale}${sourceLocale}&in=${targetLocale}&language=${sourceLocale}&fm=${true}&ref=${false}`,
			{
				headers: {
					"User-Agent": constants.USER_AGENT,
					"X-Secret": this.token,
				},
			},
		);
		if (!response.ok) {
			return undefined;
		}

		const results = (await response.json()) as PonsResult[];
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

	parse(
		_: Logos.Interaction,
		lemma: string,
		learningLanguage: PonsLanguage,
		hit: PonsDictionaryHit,
	): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];
		for (const { headword: lemmaSyllabised, wordclass: partOfSpeech, arabs: definitions } of hit.roms) {
			const [partOfSpeechFuzzy] = partOfSpeech.split(" ").reverse();
			const detection = getPartOfSpeech({
				terms: { exact: partOfSpeech, approximate: partOfSpeechFuzzy },
				learningLanguage, // Source language
			});

			entries.push({
				lemma: this.#transformLemma({ lemmaSyllabised }),
				partOfSpeech: { value: partOfSpeech, detected: detection.detected },
				definitions: this.#transformDefinitions({ definitions, learningLanguage }),
				syllables: this.#transformSyllables({ lemmaSyllabised, learningLanguage }),
				sources: [
					{
						link: constants.links.ponsDefinitionLink(lemma, {
							source: getPonsLanguageName(constants.defaults.LEARNING_LANGUAGE),
							target: getPonsLanguageName(learningLanguage),
						}),
						licence: constants.licences.dictionaries.pons,
					},
				],
			});
		}

		return entries;
	}

	#transformLemma({ lemmaSyllabised }: { lemmaSyllabised: string }): LemmaField {
		return {
			value: lemmaSyllabised.replaceAll(PonsAdapter.#underline, "").replaceAll(PonsAdapter.#syllableDivider, ""),
		};
	}

	#transformDefinitions({
		definitions,
		learningLanguage,
	}: { definitions: PonsDefinition[]; learningLanguage: LearningLanguage }): DefinitionField[] | TranslationField[] {
		const fieldsUnprocessed: DefinitionField[] | TranslationField[] = [];
		for (const { header: root, translations: rows } of definitions) {
			const rootText = cheerio.load(root).text().trim();
			if (rootText.length > 0 && !constants.patterns.ponsHeader.test(rootText)) {
				continue;
			}

			const header = rows.shift();
			if (header === undefined) {
				continue;
			}

			const value = cheerio
				.load(
					isSearchMonolingual(constants.defaults.LEARNING_LANGUAGE, learningLanguage)
						? header.source
						: header.target,
				)
				.text()
				.trim();
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
				if (!isSearchMonolingual(constants.defaults.LEARNING_LANGUAGE, learningLanguage)) {
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

		const definitionFields: DefinitionField[] | TranslationField[] = [];
		for (const field of fieldsUnprocessed) {
			const existentField = definitionFields.find((field_) => field_.value === field.value);
			if (existentField === undefined) {
				definitionFields.push(field);
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

		return definitionFields;
	}

	#transformSyllables({
		lemmaSyllabised,
		learningLanguage,
	}: { lemmaSyllabised: string; learningLanguage: LearningLanguage }): SyllableField | undefined {
		if (!isSearchMonolingual(constants.defaults.LEARNING_LANGUAGE, learningLanguage)) {
			return undefined;
		}

		const syllables = lemmaSyllabised.split(PonsAdapter.#syllableDivider).map((syllable) => {
			if (!syllable.includes(PonsAdapter.#underline)) {
				return syllable;
			}

			const firstUnderlinedLetterIndex = syllable.indexOf(PonsAdapter.#underline);
			const lastUnderlinedLetterIndex = syllable.lastIndexOf(PonsAdapter.#underline);

			return [
				syllable.substring(0, firstUnderlinedLetterIndex),
				syllable.substring(firstUnderlinedLetterIndex + 1, lastUnderlinedLetterIndex),
				syllable.substring(lastUnderlinedLetterIndex + 1),
			].join("__");
		});
		const syllablesFormatted = syllables.join(constants.special.word.ponsSyllableSeparator);

		return {
			labels: [syllables.length.toString()],
			value: syllablesFormatted,
		};
	}
}

export { PonsAdapter };
