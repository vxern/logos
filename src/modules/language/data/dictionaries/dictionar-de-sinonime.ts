import { cheerio } from '../../../../../deps.ts';
import {
	DictionaryAdapter,
	DictionaryScope,
	DictionaryType,
	SearchQuery,
} from '../dictionary.ts';

const adapter: DictionaryAdapter = {
	scope: DictionaryScope.MONOLINGUAL,
	types: [DictionaryType.DEFINING, DictionaryType.SYNONYM],
	languages: ['romanian'],

	queryBuilder: (query: SearchQuery) =>
		`https://www.dictionardesinonime.ro/?c=${query.word}`,

	lookup: async (query, builder) => {
		const response = await fetch(builder(query));
		if (!response.ok) return undefined;

		const content = await response.text();
		const $ = cheerio.load(content);

		const definitions = $('#content > div.content_page_simple > span')
			.toArray();

		for (const definition of definitions) {
			const content = $(definition).text();
			if (!content.startsWith(`${query.word.toUpperCase()} `)) continue;

			const uniformised = uniformise(content);
			const synonyms = uniformised.split(/\d+\./)
				.map((synonym) =>
					/ v\. ([a-zA-Z0-9_-ăâșțîĂÂȘȚÎ,]+)\./.exec(synonym)?.[1] ?? ''
				)
				.filter((synonym) => synonym.length > 0);
			synonyms.shift(); // Remove the headword.

			return {
				synonyms: synonyms,
			};
		}

		return {};
	},
};

/** Converts cedillas to commas, in line with the standard Romanian orthography. */
function uniformise(target: string): string {
	return target
		.replaceAll('ş', 'ș')
		.replaceAll('ţ', 'ț')
		.replaceAll('Ş', 'Ș')
		.replaceAll('Ţ', 'Ț');
}

export default adapter;
