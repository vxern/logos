import * as csv from 'std/encoding/csv.ts';
import { cheerio, convertTableToCSV } from '../../../../../deps.ts';
import { getWordType } from '../../../../../assets/localisations/words.ts';
import { Language } from '../../../../types.ts';
import { DictionaryAdapter, DictionaryEntry, DictionaryProvisions, TaggedValue, WordTypes } from '../dictionary.ts';
import { localise } from '../../../../../assets/localisations/types.ts';
import { chunk } from '../../../../utils.ts';
import { Commands } from '../../../../../assets/localisations/commands.ts';

const tabContentSelector = (tab: ContentTab) => `#tab_${tab}`;

enum ContentTab {
	Definitions = 0,
	Inflections,
	Synthesis,
	Articles,
}

type Element = cheerio.Cheerio<cheerio.Element>;
type Word = NonNullable<DictionaryEntry['word']>;
type Title = NonNullable<DictionaryEntry['title']>;
type WordType = NonNullable<DictionaryEntry['type']>;
type Definitions = NonNullable<DictionaryEntry['definitions']>;
type Etymologies = NonNullable<DictionaryEntry['etymologies']>;
type Expressions = NonNullable<DictionaryEntry['expressions']>;
type InflectionTable = NonNullable<DictionaryEntry['inflectionTable']>;

const supportedTypesForInflection = [WordTypes.Noun, WordTypes.Verb, WordTypes.Adjective, WordTypes.Determiner];

const entryNameExpression = /((?:[a-zA-ZăĂâÂîÎșȘțȚ-]+))(<sup>(\d+)<\/sup>)?/;

class Dexonline implements DictionaryAdapter {
	readonly supports: Language[] = ['Romanian'];
	readonly provides = [DictionaryProvisions.Definitions, DictionaryProvisions.Etymology];

	async query(word: string) {
		return fetch(`https://dexonline.ro/definitie/${word}`).then((response) => {
			if (!response.ok) return undefined;
			return response.text();
		});
	}

	parse(contents: string, locale: string | undefined) {
		const $ = cheerio.load(contents);

		const wordEntries = this.getWordEntries($);

		const entries: DictionaryEntry[] = [];
		for (const [heading, body] of wordEntries) {
			const { word, title, type } = this.parseHeading(heading);
			const { etymologies, definitions, expressions } = this.parseBody($, body);

			if (definitions.length === 0 && expressions.length === 0) continue;

			entries.push({
				word,
				title,
				type,
				etymologies,
				definitions: definitions.length > 0 ? definitions : undefined,
				expressions: expressions.length > 0 ? expressions : undefined,
			});
		}

		const inflectionTableElements = this.getInflectionTableEntries($);

		type InflectionTableWithMetadata = [tableElement: Element, word: string, entryIndex: number | undefined];

		const inflectionTablesWithMetadata = <InflectionTableWithMetadata[]> inflectionTableElements
			.map<InflectionTableWithMetadata | undefined>((tableElement) => {
				const entryName = tableElement.find('div[class=paraLexeme] > div > span[class=lexemeName]').html();
				if (!entryName) return undefined;

				const match = entryNameExpression.exec(entryName);
				if (!match) return undefined;

				match.shift();

				const [word, _, indexString] = match;
				if (!entries.some((entry) => entry.word === word!)) return undefined;

				const index = Number(indexString);
				return [tableElement, word!, !isNaN(index) ? (index - 1) : undefined];
			}).filter((elementOrUndefined) => !!elementOrUndefined);

		for (const [tableElement, word, entryIndex] of inflectionTablesWithMetadata) {
			const entriesByWord = entries.filter((entry) => entry.word === word);
			if (entriesByWord.length === 0) continue;

			let entry: DictionaryEntry;
			// If the inflection table entry is not indexed, rely on the entries being ordered.
			if (!entryIndex) {
				entry = entriesByWord.find((entry) => !entry.inflectionTable)!;
			} // Otherwise, use the index directly.
			else {
				if (entryIndex >= entriesByWord.length) continue;

				entry = entriesByWord.at(entryIndex)!;
			}

			if (!entry.type) continue;

			const type = entry.type[0]!;
			if (!supportedTypesForInflection.includes(type)) continue;

			const tableRows = csv.parse(convertTableToCSV(tableElement.html()));
			const table = this.tableRowsToFields(type, tableRows, locale);

			entry.inflectionTable = table;
		}

		return entries.length === 0 ? undefined : entries;
	}

	/**
	 * @returns A tuple where the first element is the heading and the second element is the body of the entry.
	 */
	private getWordEntries($: cheerio.CheerioAPI): [Element, Element][] {
		const synthesis = $(tabContentSelector(ContentTab.Synthesis));

		const entryHeadings = synthesis.find('h3[class=tree-heading] > div').toArray();
		const entryBodies = synthesis.find('div[class=tree-body]').toArray();

		return entryHeadings.map(
			(heading, index) => [$(heading), $(entryBodies.at(index)!)],
		);
	}

	private parseHeading(heading: Element): { word: Word; title: Title; type: WordType } {
		const typeString = heading.find('span[class=tree-pos-info]').remove().text().trim().toLowerCase();
		const wordDisplayed = heading.text().trim();
		const word = wordDisplayed.split(', ').at(0)!;

		const type = getWordType(typeString, 'Romanian');

		return { word, title: wordDisplayed, type: [type, typeString] };
	}

	private parseBody(
		$: cheerio.CheerioAPI,
		body: Element,
	): { etymologies: Etymologies; definitions: Definitions; expressions: Expressions } {
		const etymologies = this.getEtymologies($, body);
		const definitions = this.getEntries($, body, 'definitions');
		const expressions = this.getEntries($, body, 'expressions');

		return { etymologies, definitions, expressions };
	}

	private getEtymologies($: cheerio.CheerioAPI, body: Element): Etymologies {
		const etymologyRows = body.find(
			'div[class=etymology] > ul[class=meaningTree] > li[class="type-etymology depth-1"] > div[class=meaningContainer] > div[class=meaning-row]',
		).toArray().map((etymology) => $(etymology));

		const etymologies: Etymologies = [];
		for (const etymologyRow of etymologyRows) {
			const tags = etymologyRow.find('span[class="tag-group meaning-tags"]').children().toArray().map((element) =>
				$(element).text()
			);
			const term = etymologyRow.find('span[class="def html"]').text().trim();
			etymologies.push({ tags, value: term.length !== 0 ? term : undefined });
		}
		return etymologies;
	}

	private getEntries<T extends 'definitions' | 'expressions'>(
		$: cheerio.CheerioAPI,
		body: Element,
		type: T,
	): TaggedValue<string>[] {
		const rows = body.find(
			`ul[class=meaningTree] > li[class="type-${
				type === 'definitions' ? 'meaning' : 'expression'
			} depth-0"] > div[class=meaningContainer]`,
		).toArray().map((definition) => $(definition));

		const entries: TaggedValue<string>[] = [];
		for (const row of rows) {
			const meaningRow = row.find('div[class=meaning-row]');
			const tags = meaningRow.find('span[class="tag-group meaning-tags"] > span[class="tag "]').toArray().map((
				element,
			) => $(element).text());
			const value = meaningRow.find('span[class="def html"]').text().trim();
			entries.push({ tags, value });
		}
		return entries;
	}

	private getInflectionTableEntries($: cheerio.CheerioAPI): Element[] {
		const inflections = $(tabContentSelector(ContentTab.Inflections));
		const entryBodies = inflections.find('div[class="card mb-3 paradigmDiv"] > div[class=card-body]').toArray();
		return entryBodies.map((body) => $(body));
	}

	private tableRowsToFields(wordType: WordTypes, rows: string[][], locale: string | undefined): InflectionTable {
		switch (wordType) {
			case WordTypes.Noun: {
				return this.nounTableRowsToTable(rows, locale);
			}
			case WordTypes.Verb: {
				return this.verbTableRowsToTable(rows, locale);
			}
			case WordTypes.Adjective: {
				return this.adjectiveTableRowsToTable(rows, locale);
			}
			case WordTypes.Determiner: {
				return this.determinerTableRowsToTable(rows, locale);
			}
		}

		return [];
	}

	private nounTableRowsToTable(rows: string[][], locale: string | undefined): InflectionTable {
		const [nominativeAccusative, genitiveDative, vocative] = chunk(
			rows.slice(1).map(
				(
					columns,
				) => columns.slice(2).map((terms) => terms.split(' ').filter((term) => !term.endsWith('‑')).join(' ')),
			),
			2,
		);

		for (const row of vocative!) {
			row.pop();
		}
		vocative![0] = vocative!.at(0)!.at(0)!.split(' ');

		const numberColumn = {
			name: '⠀',
			value: `**${localise(Commands.word.strings.nouns.singular, locale)}**\n` +
				`**${localise(Commands.word.strings.nouns.plural, locale)}**`,
			inline: true,
		};

		return [{
			title: localise(Commands.word.strings.nouns.cases.cases, locale),
			fields: [
				numberColumn,
				{
					name: localise(Commands.word.strings.nouns.cases.nominativeAccusative, locale),
					value: nominativeAccusative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				{
					name: localise(Commands.word.strings.nouns.cases.genitiveDative, locale),
					value: genitiveDative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				...(vocative
					? [
						numberColumn,
						{
							name: localise(Commands.word.strings.nouns.cases.vocative, locale),
							value: vocative!.map((terms) => terms.join(', ')).join('\n'),
							inline: true,
						},
					]
					: []),
			],
		}];
	}

	private verbTableRowsToTable(rows: string[][], locale: string | undefined): InflectionTable {
		const [infinitive, longInfinitive, pastParticiple, presentParticiple, imperativeSingle, imperativePlural] = rows
			.slice(2, 3).map(
				(
					columns,
				) => columns.slice(2),
			).at(0)!.map((word) => word.split(' ').at(word.startsWith('(a)') ? 1 : 0)!);

		const [present, subjunctive, imperfect, simplePerfect, pluperfect] = rows.slice(5)
			.map((columns) => columns.slice(2))
			.reduce<string[][]>((columns, row) => {
				for (const [element, index] of row.map<[string, number]>((r, i) => [r, i])) {
					columns[index] = [
						...(columns[index] ?? []),
						element.split(' ').at(element.startsWith('(să)') ? 1 : 0)!,
					];
				}
				return columns;
			}, []);

		const imperative = `${imperativeSingle!}\n${imperativePlural!}`;
		const supine = `de ${pastParticiple}`;

		const subjunctivePresent = subjunctive!.map((conjugation) => `să ${conjugation}`);
		const subjunctivePerfect = `să fi ${pastParticiple}`;

		const futureAuxiliaryForms = ['voi', 'vei', 'va', 'vom', 'veți', 'vor'];
		const presumptiveAuxiliaryForms = ['oi', 'ăi', 'o', 'om', 'ăți', 'or'];
		const pastAuxiliaryForms = ['am', 'ai', 'a', 'am', 'ați', 'au'];
		const presentHaveForms = ['am', 'ai', 'are', 'avem', 'aveți', 'au'];
		const imperfectHaveForms = ['aveam', 'aveai', 'avea', 'aveam', 'aveați', 'aveau'];
		const conditionalAuxiliaryForms = ['aș', 'ai', 'ar', 'am', 'ați', 'ar'];

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
				title: localise(Commands.word.strings.verbs.moodsAndParticiples, locale),
				fields: [{
					name: localise(Commands.word.strings.verbs.moods.infinitive, locale),
					value: `a ${infinitive!}`,
					inline: true,
				}, {
					name: localise(Commands.word.strings.verbs.moods.longInfinitive, locale),
					value: longInfinitive!,
					inline: true,
				}, {
					name: localise(Commands.word.strings.verbs.moods.imperative, locale),
					value: imperative,
					inline: true,
				}, {
					name: localise(Commands.word.strings.verbs.moods.supine, locale),
					value: supine,
					inline: true,
				}, {
					name: localise(Commands.word.strings.verbs.participles.present, locale),
					value: presentParticiple!,
					inline: true,
				}, {
					name: localise(Commands.word.strings.verbs.participles.past, locale),
					value: pastParticiple!,
					inline: true,
				}],
			},
			{
				title: localise(Commands.word.strings.verbs.moods.indicative, locale),
				fields: [
					{
						name: localise(Commands.word.strings.verbs.tenses.present, locale),
						value: present!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.preterite, locale),
						value: simplePerfect!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.imperfect, locale),
						value: imperfect!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.pluperfect, locale),
						value: pluperfect!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.perfect, locale),
						value: indicativePerfect!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.futureCertain, locale),
						value: indicativeFutureCertain!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.futurePlanned, locale),
						value: indicativeFuturePlanned!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.futureDecided, locale),
						value: indicativeFutureDecided!.join('\n'),
						inline: true,
					},
					{
						name: `${localise(Commands.word.strings.verbs.tenses.futureIntended, locale)} (${
							localise(Commands.word.strings.verbs.popular, locale)
						})`,
						value: indicativeFutureIntended!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.futureInThePast, locale),
						value: indicativeFutureInThePast!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.futurePerfect, locale),
						value: indicativeFuturePerfect!.join('\n'),
						inline: true,
					},
				],
			},
			{
				title: localise(Commands.word.strings.verbs.moods.subjunctive, locale),
				fields: [
					{
						name: localise(Commands.word.strings.verbs.tenses.present, locale),
						value: subjunctivePresent!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.perfect, locale),
						value: subjunctivePerfect,
						inline: true,
					},
				],
			},
			{
				title: localise(Commands.word.strings.verbs.moods.conditional, locale),
				fields: [
					{
						name: localise(Commands.word.strings.verbs.tenses.present, locale),
						value: conditionalPresent!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.perfect, locale),
						value: conditionalPerfect.join('\n'),
						inline: true,
					},
				],
			},
			{
				title: localise(Commands.word.strings.verbs.moods.presumptive, locale),
				fields: [
					{
						name: localise(Commands.word.strings.verbs.tenses.present, locale),
						value: presumptivePresent!.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.presentContinuous, locale),
						value: presumptivePresentProgressive.join('\n'),
						inline: true,
					},
					{
						name: localise(Commands.word.strings.verbs.tenses.perfect, locale),
						value: presumptivePerfect.join('\n'),
						inline: true,
					},
				],
			},
		];
	}

	private adjectiveTableRowsToTable(rows: string[][], locale: string | undefined): InflectionTable {
		const [nominativeAccusative, genitiveDative] = chunk(
			rows.slice(2).map(
				(
					columns,
				) => columns.slice(2, 8).map((terms) => terms.split(' ').filter((term) => !term.endsWith('‑')).join(' ')),
			),
			2,
		);

		const numberColumn = {
			name: '⠀',
			value: `**${localise(Commands.word.strings.nouns.singular, locale)}**\n` +
				`**${localise(Commands.word.strings.nouns.plural, locale)}**`,
			inline: true,
		};

		return [{
			title: localise(Commands.word.strings.nouns.cases.cases, locale),
			fields: [
				numberColumn,
				{
					name: localise(Commands.word.strings.nouns.cases.nominativeAccusative, locale),
					value: nominativeAccusative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				{
					name: localise(Commands.word.strings.nouns.cases.genitiveDative, locale),
					value: genitiveDative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
			],
		}];
	}

	private determinerTableRowsToTable(rows: string[][], locale: string | undefined): InflectionTable {
		const [nominativeAccusative, genitiveDative] = chunk(
			rows.slice(2).map(
				(
					columns,
				) => columns.slice(2, 8).map((terms) => terms.split(' ').filter((term) => !term.endsWith('‑')).join(' ')),
			),
			2,
		);

		const numberColumn = {
			name: '⠀',
			value: `**${localise(Commands.word.strings.nouns.singular, locale)}**\n` +
				`**${localise(Commands.word.strings.nouns.plural, locale)}**`,
			inline: true,
		};

		return [{
			title: localise(Commands.word.strings.nouns.cases.cases, locale),
			fields: [
				numberColumn,
				{
					name: localise(Commands.word.strings.nouns.cases.nominativeAccusative, locale),
					value: nominativeAccusative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
				{
					name: localise(Commands.word.strings.nouns.cases.genitiveDative, locale),
					value: genitiveDative!.map((terms) => terms.join(', ')).join('\n'),
					inline: true,
				},
			],
		}];
	}
}

const adapter = new Dexonline();

export default adapter;
