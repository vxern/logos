import { Dexonline } from 'dexonline';
import { WordClass } from 'logos/src/commands/language/commands/word.ts';
import { DictionaryAdapter, DictionaryEntry, DictionaryProvisions } from 'logos/src/commands/language/data/types.ts';
import { getWordClass } from 'logos/src/commands/language/module.ts';
import { Client, localise } from 'logos/src/client.ts';
import { chunk } from 'logos/src/utils.ts';
import constants from 'logos/constants.ts';
import { Language } from 'logos/types.ts';

const classesWithInflections: WordClass[] = ['noun', 'verb', 'adjective', 'determiner'];

function hasInflections(wordClass: WordClass): boolean {
	return classesWithInflections.includes(wordClass);
}

type InflectionTable = NonNullable<DictionaryEntry['inflectionTable']>;

class DexonlineAdapter implements DictionaryAdapter<Dexonline.Results> {
	readonly supports: Language[] = ['Romanian'];
	readonly provides = [DictionaryProvisions.Definitions, DictionaryProvisions.Etymology];

	query(word: string): Promise<Dexonline.Results | undefined> {
		return Dexonline.get(word);
	}

	parse(client: Client, results: Dexonline.Results, locale: string | undefined): DictionaryEntry[] | undefined {
		const entries = results.synthesis.map<DictionaryEntry>((result) => {
			const wordClass = getWordClass(result.type);
			return {
				word: result.lemma,
				title: result.lemma,
				wordClass: [wordClass, result.type],
				definitions: result.definitions,
				etymologies: result.etymology,
				expressions: result.expressions,
				inflectionTable: undefined,
			};
		});

		for (const { index, lemma, table } of results.inflection) {
			const entriesByWord = entries.filter((entry) => entry.word === lemma);
			if (entriesByWord.length === 0) continue;

			let entry: DictionaryEntry;
			// If the inflection table entry is not indexed, rely on the entries being ordered.
			if (index === 0) {
				entry = entriesByWord.find((entry) => entry.inflectionTable === undefined)!;
			} // Otherwise, use the index directly.
			else {
				if (index >= entriesByWord.length) continue;

				entry = entriesByWord.at(index)!;
			}

			if (entry.wordClass === undefined) continue;

			const wordClass = entry.wordClass[0]!;
			if (!hasInflections(wordClass)) continue;

			const inflectionTable = this.tableRowsToFields(client, wordClass, table, locale);

			entry.inflectionTable = inflectionTable;
		}

		return entries.length === 0 ? undefined : entries;
	}

	private tableRowsToFields(
		client: Client,
		wordClass: WordClass,
		rows: string[][],
		locale: string | undefined,
	): InflectionTable {
		switch (wordClass) {
			case 'noun': {
				return this.nounTableRowsToTable(client, rows, locale);
			}
			case 'verb': {
				return this.verbTableRowsToTable(client, rows, locale);
			}
			case 'adjective': {
				return this.adjectiveTableRowsToTable(client, rows, locale);
			}
			case 'determiner': {
				return this.determinerTableRowsToTable(client, rows, locale);
			}
		}

		return [];
	}

	private nounTableRowsToTable(client: Client, rows: string[][], locale: string | undefined): InflectionTable {
		const [nominativeAccusative, genitiveDative, vocative] = chunk(
			rows
				.slice(1)
				.map(
					(columns) =>
						columns
							.slice(2)
							.map(
								(terms) =>
									terms
										.split(' ')
										.filter((term) => !term.endsWith('‑')).join(' '),
							),
				),
			2,
		);

		if (vocative !== undefined) {
			for (const row of vocative) {
				row.pop();
			}
			vocative[0] = vocative[0]![0]!.split(' ');
		}

		const singularString = localise(client, 'word.strings.nouns.singular', locale)();
		const pluralString = localise(client, 'word.strings.nouns.plural', locale)();

		const numberColumn = {
			name: constants.symbols.meta.whitespace,
			value: `**${singularString}**\n` + `**${pluralString}**`,
			inline: true,
		};

		return [{
			title: localise(client, 'word.strings.nouns.cases.cases', locale)(),
			fields: [
				numberColumn,
				{
					name: localise(client, 'word.strings.nouns.cases.nominativeAccusative', locale)(),
					value: nominativeAccusative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				{
					name: localise(client, 'word.strings.nouns.cases.genitiveDative', locale)(),
					value: genitiveDative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				...(
					vocative !== undefined
						? [
							numberColumn,
							{
								name: localise(client, 'word.strings.nouns.cases.vocative', locale)(),
								value: vocative!.map((terms) => terms.join(', ')).join('\n'),
								inline: true,
							},
						]
						: []
				),
			],
		}];
	}

	private verbTableRowsToTable(client: Client, rows: string[][], locale: string | undefined): InflectionTable {
		const [infinitive, longInfinitive, pastParticiple, presentParticiple, imperativeSingle, imperativePlural] = rows
			.slice(2, 3)
			.map((columns) => columns.slice(2))
			.at(0)!
			.map(
				(word) =>
					word
						.split(' ')
						.at(word.startsWith('(a)') ? 1 : 0)!,
			);

		const [present, subjunctive, imperfect, simplePerfect, pluperfect] = rows.slice(5)
			.map((columns) => columns.slice(2))
			.reduce<string[][]>(
				(columns, row) => {
					for (const [element, index] of row.map<[string, number]>((r, i) => [r, i])) {
						columns[index] = [
							...(columns[index] ?? []),
							element.split(' ').at(element.startsWith('(să)') ? 1 : 0)!,
						];
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

		return [
			{
				title: localise(client, 'word.strings.verbs.moodsAndParticiples', locale)(),
				fields: [{
					name: localise(client, 'word.strings.verbs.moods.infinitive', locale)(),
					value: `a ${infinitive!}`,
					inline: true,
				}, {
					name: localise(client, 'word.strings.verbs.moods.longInfinitive', locale)(),
					value: longInfinitive!,
					inline: true,
				}, {
					name: localise(client, 'word.strings.verbs.moods.imperative', locale)(),
					value: imperative,
					inline: true,
				}, {
					name: localise(client, 'word.strings.verbs.moods.supine', locale)(),
					value: supine,
					inline: true,
				}, {
					name: localise(client, 'word.strings.verbs.participles.present', locale)(),
					value: presentParticiple!,
					inline: true,
				}, {
					name: localise(client, 'word.strings.verbs.participles.past', locale)(),
					value: pastParticiple!,
					inline: true,
				}],
			},
			{
				title: localise(client, 'word.strings.verbs.moods.indicative', locale)(),
				fields: [
					{
						name: localise(client, 'word.strings.verbs.tenses.present', locale)(),
						value: present!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.preterite', locale)(),
						value: simplePerfect!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.imperfect', locale)(),
						value: imperfect!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.pluperfect', locale)(),
						value: pluperfect!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.perfect', locale)(),
						value: indicativePerfect!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.futureCertain', locale)(),
						value: indicativeFutureCertain!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.futurePlanned', locale)(),
						value: indicativeFuturePlanned!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.futureDecided', locale)(),
						value: indicativeFutureDecided!.join('\n'),
						inline: true,
					},
					{
						name: (() => {
							const futureIntendedString = localise(client, 'word.strings.verbs.tenses.futureIntended', locale)();
							const popularString = localise(client, 'word.strings.verbs.popular', locale)();

							return `${futureIntendedString} (${popularString})`;
						})(),
						value: indicativeFutureIntended!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.futureInThePast', locale)(),
						value: indicativeFutureInThePast!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.futurePerfect', locale)(),
						value: indicativeFuturePerfect!.join('\n'),
						inline: true,
					},
				],
			},
			{
				title: localise(client, 'word.strings.verbs.moods.subjunctive', locale)(),
				fields: [
					{
						name: localise(client, 'word.strings.verbs.tenses.present', locale)(),
						value: subjunctivePresent!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.perfect', locale)(),
						value: subjunctivePerfect,
						inline: true,
					},
				],
			},
			{
				title: localise(client, 'word.strings.verbs.moods.conditional', locale)(),
				fields: [
					{
						name: localise(client, 'word.strings.verbs.tenses.present', locale)(),
						value: conditionalPresent!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.perfect', locale)(),
						value: conditionalPerfect.join('\n'),
						inline: true,
					},
				],
			},
			{
				title: localise(client, 'word.strings.verbs.moods.presumptive', locale)(),
				fields: [
					{
						name: localise(client, 'word.strings.verbs.tenses.present', locale)(),
						value: presumptivePresent!.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.presentContinuous', locale)(),
						value: presumptivePresentProgressive.join('\n'),
						inline: true,
					},
					{
						name: localise(client, 'word.strings.verbs.tenses.perfect', locale)(),
						value: presumptivePerfect.join('\n'),
						inline: true,
					},
				],
			},
		];
	}

	private adjectiveTableRowsToTable(client: Client, rows: string[][], locale: string | undefined): InflectionTable {
		const [nominativeAccusative, genitiveDative] = chunk(
			rows
				.slice(2)
				.map(
					(columns) =>
						columns
							.slice(2, 8)
							.map(
								(terms) =>
									terms
										.split(' ')
										.filter((term) => !term.endsWith('‑')).join(' '),
							),
				),
			2,
		);

		const singularString = localise(client, 'word.strings.nouns.singular', locale)();
		const pluralString = localise(client, 'word.strings.nouns.plural', locale)();

		const numberColumn = {
			name: constants.symbols.meta.whitespace,
			value: `**${singularString}**\n` + `**${pluralString}**`,
			inline: true,
		};

		return [{
			title: localise(client, 'word.strings.nouns.cases.cases', locale)(),
			fields: [
				numberColumn,
				{
					name: localise(client, 'word.strings.nouns.cases.nominativeAccusative', locale)(),
					value: nominativeAccusative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				{
					name: localise(client, 'word.strings.nouns.cases.genitiveDative', locale)(),
					value: genitiveDative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
			],
		}];
	}

	private determinerTableRowsToTable(client: Client, rows: string[][], locale: string | undefined): InflectionTable {
		const [nominativeAccusative, genitiveDative] = chunk(
			rows
				.slice(2)
				.map(
					(columns) =>
						columns
							.slice(2, 8)
							.map(
								(terms) =>
									terms
										.split(' ')
										.filter((term) => !term.endsWith('‑'))
										.join(' '),
							),
				),
			2,
		);

		const singularString = localise(client, 'word.strings.nouns.singular', locale)();
		const pluralString = localise(client, 'word.strings.nouns.plural', locale)();

		const numberColumn = {
			name: constants.symbols.meta.whitespace,
			value: `**${singularString}**\n` + `**${pluralString}**`,
			inline: true,
		};

		return [{
			title: localise(client, 'word.strings.nouns.cases.cases', locale)(),
			fields: [
				numberColumn,
				{
					name: localise(client, 'word.strings.nouns.cases.nominativeAccusative', locale)(),
					value: nominativeAccusative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				{
					name: localise(client, 'word.strings.nouns.cases.genitiveDative', locale)(),
					value: genitiveDative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
			],
		}];
	}
}

const adapter = new DexonlineAdapter();

export default adapter;
