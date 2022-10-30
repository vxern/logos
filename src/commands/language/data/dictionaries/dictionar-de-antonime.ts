import { cheerio } from '../../../../../deps.ts';
import { DictionaryAdapter, DictionaryScopes, DictionaryTypes } from '../dictionary.ts';

const adapter: DictionaryAdapter = {
	scope: DictionaryScopes.Monolingual,
	types: [DictionaryTypes.Defining, DictionaryTypes.Synonym],
	languages: ['Romanian'],

	queryBuilder: (query) => `https://www.dictionardeantonime.ro/?c=${query.word}`,

	lookup: async (query, builder) => {
		const response = await fetch(builder(query));
		if (!response.ok) return undefined;

		const content = await response.text();
		const $ = cheerio.load(content);

		const definition = $('#content > div.content_page_simple > span').text();

		return {
			antonyms: [definition],
		};
	},
};

export default adapter;
