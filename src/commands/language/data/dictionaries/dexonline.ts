import { cheerio } from 'cheerio';
import { getWordType } from '../../../../../assets/localisations/words.ts';
import { Language } from '../../../../types.ts';
import { DictionaryAdapter, DictionaryEntry, DictionaryProvisions, TaggedValue } from '../dictionary.ts';

const tabContentSelector = (tab: ContentTab) => `#tab_${tab}`;

enum ContentTab {
	Definitions = 0,
	Inflections,
	Synthesis,
	Articles,
}

type Element = cheerio.Cheerio<cheerio.Element>;
type Word = DictionaryEntry['word'];
type WordType = DictionaryEntry['type'];
type Definitions = NonNullable<DictionaryEntry['definitions']>;
type Etymologies = NonNullable<DictionaryEntry['etymologies']>;
type Expressions = NonNullable<DictionaryEntry['expressions']>;

class Dexonline implements DictionaryAdapter {
	readonly supports: Language[] = ['Romanian'];
	readonly provides = [DictionaryProvisions.Definitions, DictionaryProvisions.Etymology];

	async query(word: string) {
		return fetch(`https://dexonline.ro/definitie/${word}`).then((response) => {
			if (!response.ok) return undefined;
			return response.text();
		});
	}

	parse(contents: string) {
		const $ = cheerio.load(contents);

		const wordEntries = this.getWordEntries($);

		const entries: DictionaryEntry[] = [];
		for (const [heading, body] of wordEntries) {
			const { word, type } = this.parseHeading(heading);
			const { etymologies, definitions, expressions } = this.parseBody($, body);

			if (definitions.length === 0 && expressions.length === 0) continue;

			entries.push({
				word,
				type,
				etymologies,
				definitions: definitions.length > 0 ? definitions : undefined,
				expressions: expressions.length > 0 ? expressions : undefined,
			});
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

	private parseHeading(heading: Element): { word: Word; type: WordType } {
		const typeString = heading.find('span[class=tree-pos-info]').remove().text().trim().toLowerCase();
		const word = heading.text().trim();

		const primaryType = typeString.split(' ').at(0)!;
		const type = getWordType(primaryType, 'Romanian');

		return { type: [type, typeString], word };
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
}

const adapter = new Dexonline();

export default adapter;
