import * as Dexonline from "dexonline-scraper";
import constants from "../../../../../constants/constants";
import { Languages, LearningLanguage, Locale } from "../../../../../constants/languages";
import licences from "../../../../../constants/licences";
import { code } from "../../../../../formatting";
import { Client, localise } from "../../../../client";
import { chunk } from "../../../../utils";
import { DictionaryAdapter } from "../adapter";
import {
	DefinitionField,
	DictionaryEntrySource,
	EtymologyField,
	ExampleField,
	ExpressionField,
	InflectionField,
	LemmaField,
	PartOfSpeechField,
} from "../dictionary-entry";
import { PartOfSpeech, tryDetectPartOfSpeech } from "../part-of-speech";

const knownInflectedPartsOfSpeech: readonly PartOfSpeech[] = [
	"pronoun",
	"noun",
	"verb",
	"adjective",
	"determiner",
] as const;

function hasKnownInflections(partOfSpeech: PartOfSpeech): boolean {
	return knownInflectedPartsOfSpeech.includes(partOfSpeech);
}

class DexonlineAdapter extends DictionaryAdapter<
	Dexonline.Results,
	"part-of-speech" | "definitions" | "relations" | "expressions" | "examples" | "inflection" | "etymology"
> {
	constructor() {
		super({
			identifier: "Dexonline",
			provides: new Set([
				"part-of-speech",
				"definitions",
				"relations",
				"expressions",
				"examples",
				"inflection",
				"etymology",
			]),
		});
	}

	async fetch(client: Client, lemma: string, __: Languages<LearningLanguage>) {
		let results: Dexonline.Results | undefined;
		try {
			results = await Dexonline.get(lemma, { mode: "strict" });
		} catch (exception) {
			client.log.error(`The request for lemma "${lemma}" to ${this.identifier} failed:`, exception);
			return undefined;
		}

		if (results === undefined) {
			return undefined;
		}

		return results;
	}

	parse(
		client: Client,
		lemma: string,
		languages: Languages<LearningLanguage>,
		results: Dexonline.Results,
		{ locale }: { locale: Locale },
	) {
		const lemmaField: LemmaField = { value: lemma };

		const source: DictionaryEntrySource = {
			link: constants.links.generateDexonlineDefinitionLink(lemma),
			licence: licences.dictionaries.dexonline,
		};

		const entries = [];

		for (const result of results.synthesis) {
			const { type: partOfSpeech, definitions, expressions, examples, etymology } = result;
			const [partOfSpeechFuzzy] = partOfSpeech.split(" ");
			const partOfSpeechDetected = tryDetectPartOfSpeech(
				{ exact: partOfSpeech, approximate: partOfSpeechFuzzy },
				languages.source,
			);

			const partOfSpeechField: PartOfSpeechField = { value: partOfSpeech, detected: partOfSpeechDetected };
			const definitionFields: DefinitionField[] = definitions.map((definition) => this.transformDefinition(definition));
			const expressionFields: ExpressionField[] = expressions.map((expression) => this.transformExpression(expression));
			const exampleFields: ExampleField[] = examples.map((example) => this.transformExample(example));
			const etymologyField: EtymologyField = this.transformEtymology(etymology);

			entries.push({
				lemma: lemmaField,
				partOfSpeech: partOfSpeechField,
				definitions: definitionFields,
				expressions: expressionFields,
				examples: exampleFields,
				inflection: undefined as InflectionField | undefined,
				etymology: etymologyField,
				sources: [source],
			});
		}

		for (const result of results.inflection) {
			const { index: _, table } = result;
			const partsOfSpeech = table.at(0)?.at(0)?.split("(").at(0)?.trim().split(" / ");
			if (partsOfSpeech === undefined) {
				continue;
			}

			const partOfSpeechFields: PartOfSpeechField[] = [];
			for (const partOfSpeech of partsOfSpeech) {
				const [partOfSpeechFuzzy] = partOfSpeech.split(" ");
				const partOfSpeechDetected = tryDetectPartOfSpeech(
					{ exact: partOfSpeech, approximate: partOfSpeechFuzzy },
					languages.source,
				);

				if (partOfSpeechDetected === undefined || !hasKnownInflections(partOfSpeechDetected)) {
					continue;
				}

				const partOfSpeechField: PartOfSpeechField = { value: partOfSpeech, detected: partOfSpeechDetected };

				partOfSpeechFields.push(partOfSpeechField);
			}

			if (partOfSpeechFields.length === 0) {
				continue;
			}

			const entry = entries.find((entry) =>
				partOfSpeechFields.some(
					(partOfSpeechField) =>
						entry.partOfSpeech.detected === partOfSpeechField.detected ||
						entry.partOfSpeech.value === partOfSpeechField.value,
				),
			);
			if (entry === undefined) {
				continue;
			}

			const inflectionField = this.parseInflectionTable(client, entry.partOfSpeech.detected, table, { locale });
			if (inflectionField === undefined) {
				continue;
			}

			entry.inflection = inflectionField;
		}

		return entries;
	}

	private transformDefinition(definition: Dexonline.Definition): DefinitionField {
		return {
			labels: definition.tags,
			value: definition.value,
			definitions: definition.definitions.map((definition) => this.transformDefinition(definition)),
			expressions: definition.expressions.map((expression) => this.transformExpression(expression)),
			examples: definition.examples.map((example) => this.transformExample(example)),
			relations: definition.relations,
		};
	}

	private transformExpression(expression: Dexonline.Expression): ExpressionField {
		return {
			labels: expression.tags,
			value: expression.value,
			expressions: expression.expressions.map((expression) => this.transformExpression(expression)),
			examples: expression.examples.map((example) => this.transformExample(example)),
			relations: expression.relations,
		};
	}

	private transformExample(example: Dexonline.Example): ExampleField {
		return {
			labels: example.tags,
			value: example.value,
		};
	}

	private transformEtymology(etymology: Dexonline.Etymology[]): EtymologyField {
		return {
			value: etymology
				.map((etymology) => {
					const labels = etymology.tags.map((tag) => code(tag)).join(" ");
					return `${labels} ${etymology.value}`;
				})
				.join("\n"),
		};
	}

	private parseInflectionTable(
		client: Client,
		partOfSpeech: PartOfSpeech | undefined,
		table: string[][],
		{ locale }: { locale: Locale },
	): InflectionField | undefined {
		switch (partOfSpeech) {
			case "pronoun": {
				return this.pronounTableToFields(client, table, { locale });
			}
			case "noun": {
				return this.nounTableToFields(client, table, { locale });
			}
			case "verb": {
				return this.verbTableToFields(client, table, { locale });
			}
			case "adjective": {
				return this.adjectiveTableToFields(client, table, { locale });
			}
			case "determiner": {
				return this.determinerTableToFields(client, table, { locale });
			}
		}

		return undefined;
	}

	private pronounTableToFields(
		client: Client,
		table: string[][],
		{ locale }: { locale: Locale },
	): InflectionField | undefined {
		const [nominativeAccusative, genitiveDative] = chunk(
			table.slice(1).map((columns) => columns.slice(2).join(", ")),
			2,
		);
		if (nominativeAccusative === undefined || genitiveDative === undefined) {
			return undefined;
		}

		const strings = {
			title: localise(client, "word.strings.nouns.cases.cases", locale)(),
			singular: localise(client, "word.strings.nouns.singular", locale)(),
			plural: localise(client, "word.strings.nouns.plural", locale)(),
			nominativeAccusative: localise(client, "word.strings.nouns.cases.nominativeAccusative", locale)(),
			genitiveDative: localise(client, "word.strings.nouns.cases.genitiveDative", locale)(),
			vocative: localise(client, "word.strings.nouns.cases.vocative", locale)(),
		};

		const numberColumn = {
			name: constants.symbols.meta.whitespace,
			value: `**${strings.singular}**\n**${strings.plural}**`,
			inline: true,
		};

		return {
			tabs: [
				{
					title: strings.title,
					fields: [
						numberColumn,
						{
							name: strings.nominativeAccusative,
							value: nominativeAccusative.join("\n"),
							inline: true,
						},
						{
							name: strings.genitiveDative,
							value: genitiveDative.map((part) => part.split(", ").at(0)).join("\n"),
							inline: true,
						},
					],
				},
			],
		};
	}

	private nounTableToFields(
		client: Client,
		table: string[][],
		{ locale }: { locale: Locale },
	): InflectionField | undefined {
		const [nominativeAccusative, genitiveDative, vocative] = chunk(
			table.slice(1).map((columns) => columns.slice(2)),
			2,
		);
		if (nominativeAccusative === undefined || genitiveDative === undefined) {
			return undefined;
		}

		if (vocative !== undefined) {
			for (const row of vocative) {
				row.pop();
			}
			const vocativeForms = vocative[0]?.[0]?.split(", ");
			if (vocativeForms !== undefined) {
				vocative[0] = vocativeForms;
			}
		}

		const strings = {
			title: localise(client, "word.strings.nouns.cases.cases", locale)(),
			singular: localise(client, "word.strings.nouns.singular", locale)(),
			plural: localise(client, "word.strings.nouns.plural", locale)(),
			nominativeAccusative: localise(client, "word.strings.nouns.cases.nominativeAccusative", locale)(),
			genitiveDative: localise(client, "word.strings.nouns.cases.genitiveDative", locale)(),
			vocative: localise(client, "word.strings.nouns.cases.vocative", locale)(),
		};

		const numberColumn = {
			name: constants.symbols.meta.whitespace,
			value: `**${strings.singular}**\n**${strings.plural}**`,
			inline: true,
		};

		return {
			tabs: [
				{
					title: strings.title,
					fields: [
						numberColumn,
						{
							name: strings.nominativeAccusative,
							value: nominativeAccusative.map((terms) => terms.join(", ")).join("\n"),
							inline: true,
						},
						{
							name: strings.genitiveDative,
							value: genitiveDative.map((terms) => terms.join(", ")).join("\n"),
							inline: true,
						},
						...(vocative !== undefined
							? [
									numberColumn,
									{
										name: strings.vocative,
										value: vocative.map((terms) => terms.join(", ")).join("\n"),
										inline: true,
									},
							  ]
							: []),
					],
				},
			],
		};
	}

	private verbTableToFields(
		client: Client,
		table: string[][],
		{ locale }: { locale: Locale },
	): InflectionField | undefined {
		const moods = table
			.slice(2, 3)
			.map((columns) => columns.slice(2))
			.at(0);
		if (moods === undefined) {
			return undefined;
		}

		if (moods.length < 6 || table.length < 5) {
			return undefined;
		}

		const [infinitive, longInfinitive, pastParticiple, presentParticiple, imperativeSingle, imperativePlural] =
			moods as [string, string, string, string, string, string];

		const [present, subjunctive, imperfect, simplePerfect, pluperfect] = table
			.slice(5)
			.map((columns) => columns.slice(2))
			.reduce<string[][]>((columns, row) => {
				for (const [element, index] of row.map<[string, number]>((r, i) => [r, i])) {
					columns[index] = [...(columns[index] ?? []), element];
				}
				return columns;
			}, []) as [string[], string[], string[], string[], string[]];

		const imperative = `${imperativeSingle}\n${imperativePlural}`;
		const supine = `de ${pastParticiple}`;

		const subjunctivePresent = subjunctive.map((conjugation) => `să ${conjugation}`);
		const subjunctivePerfect = `să fi ${pastParticiple}`;

		const futureAuxiliaryForms = ["voi", "vei", "va", "vom", "veți", "vor"] as const;
		const presumptiveAuxiliaryForms = ["oi", "ăi", "o", "om", "ăți", "or"] as const;
		const pastAuxiliaryForms = ["am", "ai", "a", "am", "ați", "au"] as const;
		const presentHaveForms = ["am", "ai", "are", "avem", "aveți", "au"] as const;
		const imperfectHaveForms = ["aveam", "aveai", "avea", "aveam", "aveați", "aveau"] as const;
		const conditionalAuxiliaryForms = ["aș", "ai", "ar", "am", "ați", "ar"] as const;

		const presumptivePresent = presumptiveAuxiliaryForms.map((auxiliary) => `${auxiliary} ${infinitive}`);
		const presumptivePresentProgressive = presumptiveAuxiliaryForms.map(
			(auxiliary) => `${auxiliary} fi ${presentParticiple}`,
		);
		const presumptivePerfect = presumptiveAuxiliaryForms.map((auxiliary) => `${auxiliary} fi ${pastParticiple}`);

		const indicativePerfect = pastAuxiliaryForms.map((auxiliary) => `${auxiliary} ${pastParticiple}`);
		const indicativeFutureCertain = futureAuxiliaryForms.map((auxiliary) => `${auxiliary} ${infinitive}`);
		const indicativeFuturePlanned = subjunctivePresent.map((conjugation) => `o ${conjugation}`);
		const indicativeFutureDecided = presentHaveForms.map(
			(auxiliary, index) => `${auxiliary} ${subjunctivePresent.at(index)}`,
		);
		const indicativeFutureIntended = presumptivePresent;
		const indicativeFutureInThePast = imperfectHaveForms.map(
			(auxiliary, index) => `${auxiliary} ${subjunctivePresent.at(index)}`,
		);
		const indicativeFuturePerfect = futureAuxiliaryForms.map((auxiliary) => `${auxiliary} fi ${pastParticiple}`);

		const conditionalPresent = conditionalAuxiliaryForms.map((auxiliary) => `${auxiliary} ${infinitive}`);
		const conditionalPerfect = conditionalAuxiliaryForms.map((auxiliary) => `${auxiliary} fi ${pastParticiple}`);

		const strings = {
			moodsAndParticiples: {
				title: localise(client, "word.strings.verbs.moodsAndParticiples", locale)(),
				infinitive: localise(client, "word.strings.verbs.moods.infinitive", locale)(),
				longInfinitive: localise(client, "word.strings.verbs.moods.longInfinitive", locale)(),
				imperative: localise(client, "word.strings.verbs.moods.imperative", locale)(),
				supine: localise(client, "word.strings.verbs.moods.supine", locale)(),
				present: localise(client, "word.strings.verbs.participles.present", locale)(),
				past: localise(client, "word.strings.verbs.participles.past", locale)(),
			},
			indicative: {
				title: localise(client, "word.strings.verbs.moods.indicative", locale)(),
				present: localise(client, "word.strings.verbs.tenses.present", locale)(),
				preterite: localise(client, "word.strings.verbs.tenses.preterite", locale)(),
				imperfect: localise(client, "word.strings.verbs.tenses.imperfect", locale)(),
				pluperfect: localise(client, "word.strings.verbs.tenses.pluperfect", locale)(),
				perfect: localise(client, "word.strings.verbs.tenses.perfect", locale)(),
				futureCertain: localise(client, "word.strings.verbs.tenses.futureCertain", locale)(),
				futurePlanned: localise(client, "word.strings.verbs.tenses.futurePlanned", locale)(),
				futureDecided: localise(client, "word.strings.verbs.tenses.futureDecided", locale)(),
				futureIntended: localise(client, "word.strings.verbs.tenses.futureIntended", locale)(),
				popular: localise(client, "word.strings.verbs.popular", locale)(),
				futureInThePast: localise(client, "word.strings.verbs.tenses.futureInThePast", locale)(),
				futurePerfect: localise(client, "word.strings.verbs.tenses.futurePerfect", locale)(),
			},
			subjunctive: {
				title: localise(client, "word.strings.verbs.moods.subjunctive", locale)(),
				present: localise(client, "word.strings.verbs.tenses.present", locale)(),
				perfect: localise(client, "word.strings.verbs.tenses.perfect", locale)(),
			},
			conditional: {
				title: localise(client, "word.strings.verbs.moods.conditional", locale)(),
				present: localise(client, "word.strings.verbs.tenses.present", locale)(),
				perfect: localise(client, "word.strings.verbs.tenses.perfect", locale)(),
			},
			presumptive: {
				title: localise(client, "word.strings.verbs.moods.presumptive", locale)(),
				present: localise(client, "word.strings.verbs.tenses.present", locale)(),
				presentContinuous: localise(client, "word.strings.verbs.tenses.presentContinuous", locale)(),
				perfect: localise(client, "word.strings.verbs.tenses.perfect", locale)(),
			},
		};

		return {
			tabs: [
				{
					title: strings.moodsAndParticiples.title,
					fields: [
						{
							name: strings.moodsAndParticiples.infinitive,
							value: `a ${infinitive}`,
							inline: true,
						},
						{
							name: strings.moodsAndParticiples.longInfinitive,
							value: longInfinitive,
							inline: true,
						},
						{
							name: strings.moodsAndParticiples.imperative,
							value: imperative,
							inline: true,
						},
						{
							name: strings.moodsAndParticiples.supine,
							value: supine,
							inline: true,
						},
						{
							name: strings.moodsAndParticiples.present,
							value: presentParticiple,
							inline: true,
						},
						{
							name: strings.moodsAndParticiples.past,
							value: pastParticiple,
							inline: true,
						},
					],
				},
				{
					title: strings.indicative.title,
					fields: [
						{
							name: strings.indicative.present,
							value: present.join("\n"),
							inline: true,
						},
						{
							name: strings.indicative.preterite,
							value: simplePerfect.join("\n"),
							inline: true,
						},
						{
							name: strings.indicative.imperfect,
							value: imperfect.join("\n"),
							inline: true,
						},
						{
							name: strings.indicative.pluperfect,
							value: pluperfect.join("\n"),
							inline: true,
						},
						{
							name: strings.indicative.perfect,
							value: indicativePerfect.join("\n"),
							inline: true,
						},
						{
							name: strings.indicative.futureCertain,
							value: indicativeFutureCertain.join("\n"),
							inline: true,
						},
						{
							name: strings.indicative.futurePlanned,
							value: indicativeFuturePlanned.join("\n"),
							inline: true,
						},
						{
							name: strings.indicative.futureDecided,
							value: indicativeFutureDecided.join("\n"),
							inline: true,
						},
						{
							name: `${strings.indicative.futureIntended} (${strings.indicative.popular})`,
							value: indicativeFutureIntended.join("\n"),
							inline: true,
						},
						{
							name: strings.indicative.futureInThePast,
							value: indicativeFutureInThePast.join("\n"),
							inline: true,
						},
						{
							name: strings.indicative.futurePerfect,
							value: indicativeFuturePerfect.join("\n"),
							inline: true,
						},
					],
				},
				{
					title: strings.subjunctive.title,
					fields: [
						{
							name: strings.subjunctive.present,
							value: subjunctivePresent.join("\n"),
							inline: true,
						},
						{
							name: strings.subjunctive.perfect,
							value: subjunctivePerfect,
							inline: true,
						},
					],
				},
				{
					title: strings.conditional.title,
					fields: [
						{
							name: strings.conditional.present,
							value: conditionalPresent.join("\n"),
							inline: true,
						},
						{
							name: strings.conditional.perfect,
							value: conditionalPerfect.join("\n"),
							inline: true,
						},
					],
				},
				{
					title: strings.presumptive.title,
					fields: [
						{
							name: strings.presumptive.present,
							value: presumptivePresent.join("\n"),
							inline: true,
						},
						{
							name: strings.presumptive.presentContinuous,
							value: presumptivePresentProgressive.join("\n"),
							inline: true,
						},
						{
							name: strings.presumptive.perfect,
							value: presumptivePerfect.join("\n"),
							inline: true,
						},
					],
				},
			],
		};
	}

	private adjectiveTableToFields(
		client: Client,
		table: string[][],
		{ locale }: { locale: Locale },
	): InflectionField | undefined {
		const [nominativeAccusative, genitiveDative] = chunk(
			table.slice(2).map((columns) => columns.slice(2, 8)),
			2,
		);
		if (nominativeAccusative === undefined || genitiveDative === undefined) {
			return undefined;
		}

		const strings = {
			title: localise(client, "word.strings.nouns.cases.cases", locale)(),
			singular: localise(client, "word.strings.nouns.singular", locale)(),
			plural: localise(client, "word.strings.nouns.plural", locale)(),
			nominativeAccusative: localise(client, "word.strings.nouns.cases.nominativeAccusative", locale)(),
			genitiveDative: localise(client, "word.strings.nouns.cases.genitiveDative", locale)(),
		};

		const numberColumn = {
			name: constants.symbols.meta.whitespace,
			value: `**${strings.singular}**\n**${strings.plural}**`,
			inline: true,
		};

		return {
			tabs: [
				{
					title: strings.title,
					fields: [
						numberColumn,
						{
							name: strings.nominativeAccusative,
							value: nominativeAccusative.map((terms) => terms.join(", ")).join("\n"),
							inline: true,
						},
						{
							name: strings.genitiveDative,
							value: genitiveDative.map((terms) => terms.join(", ")).join("\n"),
							inline: true,
						},
					],
				},
			],
		};
	}

	private determinerTableToFields(
		client: Client,
		table: string[][],
		{ locale }: { locale: Locale },
	): InflectionField | undefined {
		const [nominativeAccusative, genitiveDative] = chunk(
			table.slice(2).map((columns) => columns.slice(2, 8)),
			2,
		);
		if (nominativeAccusative === undefined || genitiveDative === undefined) {
			return undefined;
		}

		const strings = {
			title: localise(client, "word.strings.nouns.cases.cases", locale)(),
			singular: localise(client, "word.strings.nouns.singular", locale)(),
			plural: localise(client, "word.strings.nouns.plural", locale)(),
			nominativeAccusative: localise(client, "word.strings.nouns.cases.nominativeAccusative", locale)(),
			genitiveDative: localise(client, "word.strings.nouns.cases.genitiveDative", locale)(),
		};

		const numberColumn = {
			name: constants.symbols.meta.whitespace,
			value: `**${strings.singular}**\n**${strings.plural}**`,
			inline: true,
		};

		return {
			tabs: [
				{
					title: strings.title,
					fields: [
						numberColumn,
						{
							name: strings.nominativeAccusative,
							value: nominativeAccusative.map((terms) => terms.join(", ")).join("\n"),
							inline: true,
						},
						{
							name: strings.genitiveDative,
							value: genitiveDative.map((terms) => terms.join(", ")).join("\n"),
							inline: true,
						},
					],
				},
			],
		};
	}
}

const adapter = new DexonlineAdapter();

export default adapter;
