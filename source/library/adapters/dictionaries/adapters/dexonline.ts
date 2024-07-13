import type { LearningLanguage } from "logos:constants/languages/learning";
import { type PartOfSpeech, getPartOfSpeech } from "logos:constants/parts-of-speech";
import { code } from "logos:core/formatting.ts";
import * as Dexonline from "dexonline-scraper";
import { DictionaryAdapter, type DictionaryEntry } from "logos/adapters/dictionaries/adapter";
import type {
	DefinitionField,
	EtymologyField,
	ExampleField,
	ExpressionField,
	InflectionField,
	PartOfSpeechField,
} from "logos/adapters/dictionaries/dictionary-entry.ts";
import type { Client } from "logos/client";

class DexonlineAdapter extends DictionaryAdapter<Dexonline.Results> {
	static readonly #supportedPartsOfSpeech: PartOfSpeech[] = ["pronoun", "noun", "verb", "adjective", "determiner"];
	static readonly #futureAuxiliaryForms = ["voi", "vei", "va", "vom", "veți", "vor"];
	static readonly #presumptiveAuxiliaryForms = ["oi", "ăi", "o", "om", "ăți", "or"];
	static readonly #pastAuxiliaryForms = ["am", "ai", "a", "am", "ați", "au"];
	static readonly #presentHaveForms = ["am", "ai", "are", "avem", "aveți", "au"];
	static readonly #imperfectHaveForms = ["aveam", "aveai", "avea", "aveam", "aveați", "aveau"];
	static readonly #conditionalAuxiliaryForms = ["aș", "ai", "ar", "am", "ați", "ar"];

	constructor(client: Client) {
		super(client, {
			identifier: "Dexonline",
			provides: [
				"partOfSpeech",
				"definitions",
				"relations",
				"expressions",
				"examples",
				"inflection",
				"etymology",
			],
			supports: ["Romanian"],
		});
	}

	static #isSupported(partOfSpeech: PartOfSpeech): boolean {
		return DexonlineAdapter.#supportedPartsOfSpeech.includes(partOfSpeech);
	}

	fetch(lemma: string, _: LearningLanguage): Promise<Dexonline.Results | undefined> {
		return Dexonline.get(lemma, { mode: "strict" });
	}

	parse(
		interaction: Logos.Interaction,
		_: string,
		learningLanguage: LearningLanguage,
		results: Dexonline.Results,
	): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];
		for (const result of results.synthesis) {
			const [topicWord] = result.type.split(" ");
			if (topicWord === undefined) {
				continue;
			}

			const partOfSpeech = getPartOfSpeech({
				terms: { exact: result.type, approximate: topicWord },
				learningLanguage: "Romanian",
			});

			entries.push({
				lemma: { value: result.lemma },
				partOfSpeech: { value: partOfSpeech.detected, detected: partOfSpeech.detected },
				definitions: result.definitions.map(DexonlineAdapter.#transformDefinition),
				etymology: DexonlineAdapter.#transformEtymology(result.etymology),
				expressions: result.expressions.map(DexonlineAdapter.#transformExpression),
				examples: result.examples.map(DexonlineAdapter.#transformExample),
				inflection: undefined,
				sources: [
					{
						link: constants.links.dexonlineDefinition(result.lemma),
						licence: constants.licences.dictionaries.dexonline,
					},
				],
			});
		}

		for (const { table } of results.inflection) {
			const partsOfSpeech = table.at(0)?.at(0)?.split("(").at(0)?.trim().split(" / ");
			if (partsOfSpeech === undefined) {
				continue;
			}

			const partOfSpeechFields: PartOfSpeechField[] = [];
			for (const partOfSpeech of partsOfSpeech) {
				const [partOfSpeechFuzzy] = partOfSpeech.split(" ");
				const detection = getPartOfSpeech({
					terms: { exact: partOfSpeech, approximate: partOfSpeechFuzzy },
					learningLanguage,
				});
				if (detection === undefined || !DexonlineAdapter.#isSupported(detection.detected)) {
					continue;
				}

				partOfSpeechFields.push({ value: partOfSpeech, detected: detection.detected });
			}

			if (partOfSpeechFields.length === 0) {
				continue;
			}

			const entry = entries.find((entry) =>
				partOfSpeechFields.some(
					(partOfSpeechField) =>
						entry.partOfSpeech !== undefined &&
						(entry.partOfSpeech.detected === partOfSpeechField.detected ||
							entry.partOfSpeech.value === partOfSpeechField.value),
				),
			);
			if (entry === undefined || entry.partOfSpeech === undefined) {
				continue;
			}

			const inflectionField = this.#transformInflection(interaction, {
				partOfSpeech: entry.partOfSpeech.detected,
				table,
			});
			if (inflectionField === undefined) {
				continue;
			}

			entry.inflection = inflectionField;
		}

		return entries;
	}

	static #transformDefinition(definition: Dexonline.Synthesis.Definition): DefinitionField {
		return {
			labels: definition.tags,
			value: definition.value,
			definitions: definition.definitions.map((definition) => DexonlineAdapter.#transformDefinition(definition)),
			expressions: definition.expressions.map((expression) => DexonlineAdapter.#transformExpression(expression)),
			examples: definition.examples.map((example) => DexonlineAdapter.#transformExample(example)),
			relations: definition.relations,
		};
	}

	static #transformExpression(expression: Dexonline.Synthesis.Expression): ExpressionField {
		return {
			labels: expression.tags,
			value: expression.value,
			expressions: expression.expressions.map((expression) => DexonlineAdapter.#transformExpression(expression)),
			examples: expression.examples.map((example) => DexonlineAdapter.#transformExample(example)),
			relations: expression.relations,
		};
	}

	static #transformExample(example: Dexonline.Synthesis.Example): ExampleField {
		return {
			labels: example.tags,
			value: example.value,
		};
	}

	static #transformEtymology(etymology: Dexonline.Synthesis.Etymology[]): EtymologyField {
		return {
			value: etymology
				.map((etymology) => {
					const labels = etymology.tags.map((tag) => code(tag)).join(" ");
					return `${labels} ${etymology.value}`;
				})
				.join("\n"),
		};
	}

	#transformInflection(
		interaction: Logos.Interaction,
		{
			partOfSpeech,
			table,
		}: {
			partOfSpeech: PartOfSpeech;
			table: string[][];
		},
	): InflectionField | undefined {
		switch (partOfSpeech) {
			case "pronoun": {
				return this.#pronounTableToFields(interaction, { table });
			}
			case "noun": {
				return this.#nounTableToFields(interaction, { table });
			}
			case "verb": {
				return this.#verbTableToFields(interaction, { table });
			}
			case "adjective":
			case "determiner": {
				return this.#adjectiveTableToFields(interaction, { table });
			}
		}

		return undefined;
	}

	#pronounTableToFields(
		interaction: Logos.Interaction,
		{ table }: { table: string[][] },
	): InflectionField | undefined {
		const [nominativeAccusative, genitiveDative] = table
			.slice(1)
			.map((columns) => columns.slice(2).join(", "))
			.toChunked(2);
		if (nominativeAccusative === undefined || genitiveDative === undefined) {
			return undefined;
		}

		const strings = constants.contexts.dexonlinePronoun({
			localise: this.client.localise.bind(this.client),
			locale: interaction.parameters.show ? interaction.guildLocale : interaction.locale,
		});
		return {
			tabs: [
				{
					title: strings.title,
					fields: [
						{
							name: constants.special.meta.whitespace,
							value: `**${strings.singular}**\n**${strings.plural}**`,
							inline: true,
						},
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

	#nounTableToFields(interaction: Logos.Interaction, { table }: { table: string[][] }): InflectionField | undefined {
		const [nominativeAccusative, genitiveDative, vocative] = table
			.slice(1)
			.map((columns) => columns.slice(2))
			.toChunked(2);
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

		const strings = constants.contexts.dexonlineNoun({
			localise: this.client.localise.bind(this.client),
			locale: interaction.locale,
		});
		const numberColumn = {
			name: constants.special.meta.whitespace,
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

	#verbTableToFields(interaction: Logos.Interaction, { table }: { table: string[][] }): InflectionField | undefined {
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

		const presumptivePresent = DexonlineAdapter.#presumptiveAuxiliaryForms.map(
			(auxiliary) => `${auxiliary} ${infinitive}`,
		);
		const presumptivePresentProgressive = DexonlineAdapter.#presumptiveAuxiliaryForms.map(
			(auxiliary) => `${auxiliary} fi ${presentParticiple}`,
		);
		const presumptivePerfect = DexonlineAdapter.#presumptiveAuxiliaryForms.map(
			(auxiliary) => `${auxiliary} fi ${pastParticiple}`,
		);

		const indicativePerfect = DexonlineAdapter.#pastAuxiliaryForms.map(
			(auxiliary) => `${auxiliary} ${pastParticiple}`,
		);
		const indicativeFutureCertain = DexonlineAdapter.#futureAuxiliaryForms.map(
			(auxiliary) => `${auxiliary} ${infinitive}`,
		);
		const indicativeFuturePlanned = subjunctivePresent.map((conjugation) => `o ${conjugation}`);
		const indicativeFutureDecided = DexonlineAdapter.#presentHaveForms.map(
			(auxiliary, index) => `${auxiliary} ${subjunctivePresent.at(index)}`,
		);
		const indicativeFutureIntended = presumptivePresent;
		const indicativeFutureInThePast = DexonlineAdapter.#imperfectHaveForms.map(
			(auxiliary, index) => `${auxiliary} ${subjunctivePresent.at(index)}`,
		);
		const indicativeFuturePerfect = DexonlineAdapter.#futureAuxiliaryForms.map(
			(auxiliary) => `${auxiliary} fi ${pastParticiple}`,
		);

		const conditionalPresent = DexonlineAdapter.#conditionalAuxiliaryForms.map(
			(auxiliary) => `${auxiliary} ${infinitive}`,
		);
		const conditionalPerfect = DexonlineAdapter.#conditionalAuxiliaryForms.map(
			(auxiliary) => `${auxiliary} fi ${pastParticiple}`,
		);

		const strings = constants.contexts.dexonlineVerb({
			localise: this.client.localise.bind(this.client),
			locale: interaction.locale,
		});
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

	#adjectiveTableToFields(
		interaction: Logos.Interaction,
		{ table }: { table: string[][] },
	): InflectionField | undefined {
		const [nominativeAccusative, genitiveDative] = table
			.slice(2)
			.map((columns) => columns.slice(2, 8))
			.toChunked(2);
		if (nominativeAccusative === undefined || genitiveDative === undefined) {
			return undefined;
		}

		const strings = constants.contexts.dexonlineAdjective({
			localise: this.client.localise.bind(this.client),
			locale: interaction.locale,
		});
		return {
			tabs: [
				{
					title: strings.title,
					fields: [
						{
							name: constants.special.meta.whitespace,
							value: `**${strings.singular}**\n**${strings.plural}**`,
							inline: true,
						},
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

export { DexonlineAdapter };
