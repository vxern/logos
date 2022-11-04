import { cheerio } from 'cheerio';
import { Language } from '../../../../types.ts';
import { DictionaryAdapter, DictionaryEntry, DictionaryProvisions } from '../dictionary.ts';

const tabContentSelector = (tab: ContentTab) => `#tab_${tab}`;

enum ContentTab {
	Definitions = 0,
	Inflections,
	Synthesis,
	Articles,
}

type Element = cheerio.Cheerio<cheerio.Element>;

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
			const { word } = this.parseHeading(heading);
			const { etymologies, definitions } = this.parseBody($, body);

			entries.push({ word, etymologies, definitions });
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

	private parseHeading(heading: Element): Required<{ type: string; word: string }> {
		const type = heading.find('span[class=tree-pos-info]').remove().text();
		const word = heading.text().trim();
		return { type, word };
	}

	private parseBody(
		$: cheerio.CheerioAPI,
		body: Element,
	): Required<{ etymologies: DictionaryEntry['etymologies']; definitions: DictionaryEntry['definitions'] }> {
		const etymologies = this.getEtymologies($, body);
		const definitions = this.getDefinitions($, body);

		return { etymologies, definitions };
	}

	private getEtymologies($: cheerio.CheerioAPI, body: Element): DictionaryEntry['etymologies'] {
		const etymologyRows = body.find(
			'div[class=etymology] > ul[class=meaningTree] > li[class="type-etymology depth-1"] > div[class=meaningContainer] > div[class=meaning-row]',
		).toArray().map((etymology) => $(etymology));

		const etymologies: DictionaryEntry['etymologies'] = [];
		for (const etymologyRow of etymologyRows) {
			const tags = etymologyRow.find('span[class="tag-group meaning-tags"]').children().toArray().map((element) =>
				$(element).text()
			);
			const term = etymologyRow.find('span[class="def html"]').text().trim();
			etymologies.push({ tags, value: term.length !== 0 ? term : undefined });
		}
		return etymologies;
	}

	private getDefinitions($: cheerio.CheerioAPI, body: Element): DictionaryEntry['definitions'] {
		const definitionRows = body.find(
			'ul[class=meaningTree] > li[class="type-meaning depth-0"] > div[class=meaningContainer]',
		).toArray().map((definition) => $(definition));

		const definitions: DictionaryEntry['definitions'] = [];
		for (const definitionRow of definitionRows) {
			const row = definitionRow.find('div[class=meaning-row]');
			const tags = row.find('span[class="tag-group meaning-tags"] > span[class="tag "]').toArray().map((element) =>
				$(element).text()
			);
			const definition = row.find('span[class="def html"]').text().trim();
			definitions.push({ tags, value: definition });
		}
		return definitions;
	}
}

const adapter = new Dexonline();

export default adapter;
