import { cheerio } from '../../../../../deps.ts';
import {
	DictionaryAdapter,
	DictionaryScope,
	DictionaryType,
} from '../dictionary.ts';

const adapter: DictionaryAdapter = {
	scope: DictionaryScope.MONOLINGUAL,
	types: [DictionaryType.DEFINING, DictionaryType.SYNONYM],
	languages: ['romanian'],

	queryBuilder: (query) =>
		`https://www.dictionardeantonime.ro/?c=${query.word}`,

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
