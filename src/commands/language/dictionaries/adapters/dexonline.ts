import * as Dexonline from 'dexonline';
import { PartOfSpeech } from 'logos/src/commands/language/dictionaries/parts-of-speech.ts';
import {
	DictionaryAdapter,
	DictionaryEntry,
	DictionaryProvisions,
} from 'logos/src/commands/language/dictionaries/adapter.ts';
import { getPartOfSpeech } from 'logos/src/commands/language/module.ts';
import { Client, localise } from 'logos/src/client.ts';
import { chunk } from 'logos/src/utils.ts';
import constants from 'logos/constants.ts';
import { Language } from 'logos/types.ts';

const classesWithInflections: PartOfSpeech[] = ['pronoun', 'noun', 'verb', 'adjective', 'determiner'];

function hasInflections(partOfSpeech: PartOfSpeech): boolean {
	return classesWithInflections.includes(partOfSpeech);
}

type InflectionTable = NonNullable<DictionaryEntry['inflectionTable']>;

class DexonlineAdapter extends DictionaryAdapter<Dexonline.Results> {
	readonly name = 'Dexonline';
	readonly supports: Language[] = ['Romanian'];
	readonly provides = [DictionaryProvisions.Definitions, DictionaryProvisions.Etymology];

	fetch(lemma: string, _: Language): Promise<Dexonline.Results | undefined> {
		return Dexonline.get(lemma, { mode: 'strict' });
	}

	parse(_: string, results: Dexonline.Results, client: Client, locale: string | undefined): DictionaryEntry[] {
		const entries: DictionaryEntry[] = [];
		for (const result of results.synthesis) {
			const partOfSpeech = getPartOfSpeech(result.type, result.type.split(' ').at(0)!, 'Romanian');

			entries.push({
				lemma: result.lemma,
				title: result.lemma,
				partOfSpeech,
				nativeDefinitions: result.definitions,
				etymologies: result.etymology,
				expressions: result.expressions,
				inflectionTable: undefined,
			});
		}

		for (const { table } of results.inflection) {
			const partsOfSpeech = table.at(0)!.at(0)!.split('(').at(0)!.trim().split(' / ');
			const withInflections = partsOfSpeech.map((partOfSpeech) =>
				getPartOfSpeech(partOfSpeech, partOfSpeech.split(' ').at(0)!, 'Romanian')
			).filter((partOfSpeech) => hasInflections(partOfSpeech[0]));
			if (withInflections.length === 0) continue;

			const entry = entries.find((entry) =>
				withInflections.some((partOfSpeech) =>
					entry.partOfSpeech[1] === partOfSpeech[1] || entry.partOfSpeech[0] === partOfSpeech[0]
				)
			);
			if (entry === undefined) continue;

			const inflectionTable = this.tableRowsToFields(client, entry.partOfSpeech[0], table, locale);

			entry.inflectionTable = inflectionTable;
		}

		return entries;
	}

	private tableRowsToFields(
		client: Client,
		partOfSpeech: PartOfSpeech,
		table: string[][],
		locale: string | undefined,
	): InflectionTable {
		switch (partOfSpeech) {
			case 'pronoun': {
				return this.pronounTableToFields(client, table, locale);
			}
			case 'noun': {
				return this.nounTableToFields(client, table, locale);
			}
			case 'verb': {
				return this.verbTableToFields(client, table, locale);
			}
			case 'adjective': {
				return this.adjectiveTableToFields(client, table, locale);
			}
			case 'determiner': {
				return this.determinerTableToFields(client, table, locale);
			}
		}

		return [];
	}

	private pronounTableToFields(client: Client, table: string[][], locale: string | undefined): InflectionTable {
		const [nominativeAccusative, genitiveDative] = chunk(
			table.slice(1).map((columns) => columns.slice(2).join(', ')),
			2,
		);

		const strings = {
			title: localise(client, 'word.strings.nouns.cases.cases', locale)(),
			singular: localise(client, 'word.strings.nouns.singular', locale)(),
			plural: localise(client, 'word.strings.nouns.plural', locale)(),
			nominativeAccusative: localise(client, 'word.strings.nouns.cases.nominativeAccusative', locale)(),
			genitiveDative: localise(client, 'word.strings.nouns.cases.genitiveDative', locale)(),
			vocative: localise(client, 'word.strings.nouns.cases.vocative', locale)(),
		};

		const numberColumn = {
			name: constants.symbols.meta.whitespace,
			value: `**${strings.singular}**\n` + `**${strings.plural}**`,
			inline: true,
		};

		return [{
			title: strings.title,
			fields: [
				numberColumn,
				{
					name: strings.nominativeAccusative,
					value: nominativeAccusative!.join('\n'),
					inline: true,
				},
				{
					name: strings.genitiveDative,
					value: genitiveDative!.map((part) => part.split(', ').at(0)!).join('\n'),
					inline: true,
				},
			],
		}];
	}

	private nounTableToFields(client: Client, table: string[][], locale: string | undefined): InflectionTable {
		const [nominativeAccusative, genitiveDative, vocative] = chunk(
			table.slice(1).map((columns) => columns.slice(2)),
			2,
		);

		if (vocative !== undefined) {
			for (const row of vocative) {
				row.pop();
			}
			vocative[0] = vocative[0]![0]!.split(', ');
		}

		const strings = {
			title: localise(client, 'word.strings.nouns.cases.cases', locale)(),
			singular: localise(client, 'word.strings.nouns.singular', locale)(),
			plural: localise(client, 'word.strings.nouns.plural', locale)(),
			nominativeAccusative: localise(client, 'word.strings.nouns.cases.nominativeAccusative', locale)(),
			genitiveDative: localise(client, 'word.strings.nouns.cases.genitiveDative', locale)(),
			vocative: localise(client, 'word.strings.nouns.cases.vocative', locale)(),
		};

		const numberColumn = {
			name: constants.symbols.meta.whitespace,
			value: `**${strings.singular}**\n` + `**${strings.plural}**`,
			inline: true,
		};

		return [{
			title: strings.title,
			fields: [
				numberColumn,
				{
					name: strings.nominativeAccusative,
					value: nominativeAccusative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				{
					name: strings.genitiveDative,
					value: genitiveDative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				...(
					vocative !== undefined
						? [
							numberColumn,
							{
								name: strings.vocative,
								value: vocative!.map((terms) => terms.join(', ')).join('\n'),
								inline: true,
							},
						]
						: []
				),
			],
		}];
	}

	private verbTableToFields(client: Client, table: string[][], locale: string | undefined): InflectionTable {
		const [infinitive, longInfinitive, pastParticiple, presentParticiple, imperativeSingle, imperativePlural] = table
			.slice(2, 3)
			.map((columns) => columns.slice(2))
			.at(0)!;

		const [present, subjunctive, imperfect, simplePerfect, pluperfect] = table.slice(5)
			.map((columns) => columns.slice(2))
			.reduce<string[][]>(
				(columns, row) => {
					for (const [element, index] of row.map<[string, number]>((r, i) => [r, i])) {
						columns[index] = [...(columns[index] ?? []), element];
					}
					return columns;
				},
				[],
			);

		const imperative = `${imperativeSingle!}\n${imperativePlural!}`;
		const supine = `de ${pastParticiple}`;

		const subjunctivePresent = subjunctive!.map((conjugation) => `să ${conjugation}`);
		const subjunctivePerfect = `să fi ${pastParticiple}`;

		const futureAuxiliaryForms = ['voi', 'vei', 'va', 'vom', 'veți', 'vor'] as const;
		const presumptiveAuxiliaryForms = ['oi', 'ăi', 'o', 'om', 'ăți', 'or'] as const;
		const pastAuxiliaryForms = ['am', 'ai', 'a', 'am', 'ați', 'au'] as const;
		const presentHaveForms = ['am', 'ai', 'are', 'avem', 'aveți', 'au'] as const;
		const imperfectHaveForms = ['aveam', 'aveai', 'avea', 'aveam', 'aveați', 'aveau'] as const;
		const conditionalAuxiliaryForms = ['aș', 'ai', 'ar', 'am', 'ați', 'ar'] as const;

		const presumptivePresent = presumptiveAuxiliaryForms
			.map((auxiliary) => `${auxiliary} ${infinitive}`);
		const presumptivePresentProgressive = presumptiveAuxiliaryForms
			.map((auxiliary) => `${auxiliary} fi ${presentParticiple}`);
		const presumptivePerfect = presumptiveAuxiliaryForms
			.map((auxiliary) => `${auxiliary} fi ${pastParticiple}`);

		const indicativePerfect = pastAuxiliaryForms.map((auxiliary) => `${auxiliary} ${pastParticiple}`);
		const indicativeFutureCertain = futureAuxiliaryForms
			.map((auxiliary) => `${auxiliary} ${infinitive}`);
		const indicativeFuturePlanned = subjunctivePresent.map((conjugation) => `o ${conjugation}`);
		const indicativeFutureDecided = presentHaveForms
			.map((auxiliary, index) => `${auxiliary} ${subjunctivePresent.at(index)!}`);
		const indicativeFutureIntended = presumptivePresent;
		const indicativeFutureInThePast = imperfectHaveForms.map((auxiliary, index) =>
			`${auxiliary} ${subjunctivePresent.at(index)!}`
		);
		const indicativeFuturePerfect = futureAuxiliaryForms.map((auxiliary) => `${auxiliary} fi ${pastParticiple}`);

		const conditionalPresent = conditionalAuxiliaryForms.map((auxiliary) => `${auxiliary} ${infinitive}`);
		const conditionalPerfect = conditionalAuxiliaryForms.map((auxiliary) => `${auxiliary} fi ${pastParticiple}`);

		const strings = {
			moodsAndParticiples: {
				title: localise(client, 'word.strings.verbs.moodsAndParticiples', locale)(),
				infinitive: localise(client, 'word.strings.verbs.moods.infinitive', locale)(),
				longInfinitive: localise(client, 'word.strings.verbs.moods.longInfinitive', locale)(),
				imperative: localise(client, 'word.strings.verbs.moods.imperative', locale)(),
				supine: localise(client, 'word.strings.verbs.moods.supine', locale)(),
				present: localise(client, 'word.strings.verbs.participles.present', locale)(),
				past: localise(client, 'word.strings.verbs.participles.past', locale)(),
			},
			indicative: {
				title: localise(client, 'word.strings.verbs.moods.indicative', locale)(),
				present: localise(client, 'word.strings.verbs.tenses.present', locale)(),
				preterite: localise(client, 'word.strings.verbs.tenses.preterite', locale)(),
				imperfect: localise(client, 'word.strings.verbs.tenses.imperfect', locale)(),
				pluperfect: localise(client, 'word.strings.verbs.tenses.pluperfect', locale)(),
				perfect: localise(client, 'word.strings.verbs.tenses.perfect', locale)(),
				futureCertain: localise(client, 'word.strings.verbs.tenses.futureCertain', locale)(),
				futurePlanned: localise(client, 'word.strings.verbs.tenses.futurePlanned', locale)(),
				futureDecided: localise(client, 'word.strings.verbs.tenses.futureDecided', locale)(),
				futureIntended: localise(client, 'word.strings.verbs.tenses.futureIntended', locale)(),
				popular: localise(client, 'word.strings.verbs.popular', locale)(),
				futureInThePast: localise(client, 'word.strings.verbs.tenses.futureInThePast', locale)(),
				futurePerfect: localise(client, 'word.strings.verbs.tenses.futurePerfect', locale)(),
			},
			subjunctive: {
				title: localise(client, 'word.strings.verbs.moods.subjunctive', locale)(),
				present: localise(client, 'word.strings.verbs.tenses.present', locale)(),
				perfect: localise(client, 'word.strings.verbs.tenses.perfect', locale)(),
			},
			conditional: {
				title: localise(client, 'word.strings.verbs.moods.conditional', locale)(),
				present: localise(client, 'word.strings.verbs.tenses.present', locale)(),
				perfect: localise(client, 'word.strings.verbs.tenses.perfect', locale)(),
			},
			presumptive: {
				title: localise(client, 'word.strings.verbs.moods.presumptive', locale)(),
				present: localise(client, 'word.strings.verbs.tenses.present', locale)(),
				presentContinuous: localise(client, 'word.strings.verbs.tenses.presentContinuous', locale)(),
				perfect: localise(client, 'word.strings.verbs.tenses.perfect', locale)(),
			},
		};

		return [
			{
				title: strings.moodsAndParticiples.title,
				fields: [{
					name: strings.moodsAndParticiples.infinitive,
					value: `a ${infinitive!}`,
					inline: true,
				}, {
					name: strings.moodsAndParticiples.longInfinitive,
					value: longInfinitive!,
					inline: true,
				}, {
					name: strings.moodsAndParticiples.imperative,
					value: imperative,
					inline: true,
				}, {
					name: strings.moodsAndParticiples.supine,
					value: supine,
					inline: true,
				}, {
					name: strings.moodsAndParticiples.present,
					value: presentParticiple!,
					inline: true,
				}, {
					name: strings.moodsAndParticiples.past,
					value: pastParticiple!,
					inline: true,
				}],
			},
			{
				title: strings.indicative.title,
				fields: [
					{
						name: strings.indicative.present,
						value: present!.join('\n'),
						inline: true,
					},
					{
						name: strings.indicative.preterite,
						value: simplePerfect!.join('\n'),
						inline: true,
					},
					{
						name: strings.indicative.imperfect,
						value: imperfect!.join('\n'),
						inline: true,
					},
					{
						name: strings.indicative.pluperfect,
						value: pluperfect!.join('\n'),
						inline: true,
					},
					{
						name: strings.indicative.perfect,
						value: indicativePerfect!.join('\n'),
						inline: true,
					},
					{
						name: strings.indicative.futureCertain,
						value: indicativeFutureCertain!.join('\n'),
						inline: true,
					},
					{
						name: strings.indicative.futurePlanned,
						value: indicativeFuturePlanned!.join('\n'),
						inline: true,
					},
					{
						name: strings.indicative.futureDecided,
						value: indicativeFutureDecided!.join('\n'),
						inline: true,
					},
					{
						name: `${strings.indicative.futureIntended} (${strings.indicative.popular})`,
						value: indicativeFutureIntended!.join('\n'),
						inline: true,
					},
					{
						name: strings.indicative.futureInThePast,
						value: indicativeFutureInThePast!.join('\n'),
						inline: true,
					},
					{
						name: strings.indicative.futurePerfect,
						value: indicativeFuturePerfect!.join('\n'),
						inline: true,
					},
				],
			},
			{
				title: strings.subjunctive.title,
				fields: [
					{
						name: strings.subjunctive.present,
						value: subjunctivePresent!.join('\n'),
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
						value: conditionalPresent!.join('\n'),
						inline: true,
					},
					{
						name: strings.conditional.perfect,
						value: conditionalPerfect.join('\n'),
						inline: true,
					},
				],
			},
			{
				title: strings.presumptive.title,
				fields: [
					{
						name: strings.presumptive.present,
						value: presumptivePresent!.join('\n'),
						inline: true,
					},
					{
						name: strings.presumptive.presentContinuous,
						value: presumptivePresentProgressive.join('\n'),
						inline: true,
					},
					{
						name: strings.presumptive.perfect,
						value: presumptivePerfect.join('\n'),
						inline: true,
					},
				],
			},
		];
	}

	private adjectiveTableToFields(client: Client, table: string[][], locale: string | undefined): InflectionTable {
		const [nominativeAccusative, genitiveDative] = chunk(table.slice(2).map((columns) => columns.slice(2, 8)), 2);

		const strings = {
			title: localise(client, 'word.strings.nouns.cases.cases', locale)(),
			singular: localise(client, 'word.strings.nouns.singular', locale)(),
			plural: localise(client, 'word.strings.nouns.plural', locale)(),
			nominativeAccusative: localise(client, 'word.strings.nouns.cases.nominativeAccusative', locale)(),
			genitiveDative: localise(client, 'word.strings.nouns.cases.genitiveDative', locale)(),
		};

		const numberColumn = {
			name: constants.symbols.meta.whitespace,
			value: `**${strings.singular}**\n` + `**${strings.plural}**`,
			inline: true,
		};

		return [{
			title: strings.title,
			fields: [
				numberColumn,
				{
					name: strings.nominativeAccusative,
					value: nominativeAccusative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				{
					name: strings.genitiveDative,
					value: genitiveDative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
			],
		}];
	}

	private determinerTableToFields(client: Client, table: string[][], locale: string | undefined): InflectionTable {
		const [nominativeAccusative, genitiveDative] = chunk(table.slice(2).map((columns) => columns.slice(2, 8)), 2);

		const strings = {
			title: localise(client, 'word.strings.nouns.cases.cases', locale)(),
			singular: localise(client, 'word.strings.nouns.singular', locale)(),
			plural: localise(client, 'word.strings.nouns.plural', locale)(),
			nominativeAccusative: localise(client, 'word.strings.nouns.cases.nominativeAccusative', locale)(),
			genitiveDative: localise(client, 'word.strings.nouns.cases.genitiveDative', locale)(),
		};

		const numberColumn = {
			name: constants.symbols.meta.whitespace,
			value: `**${strings.singular}**\n` + `**${strings.plural}**`,
			inline: true,
		};

		return [{
			title: strings.title,
			fields: [
				numberColumn,
				{
					name: strings.nominativeAccusative,
					value: nominativeAccusative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				{
					name: strings.genitiveDative,
					value: genitiveDative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
			],
		}];
	}
}

const adapter = new DexonlineAdapter();

export default adapter;
