import { cheerio } from '../../../../../deps.ts';
import {
	Dictionary,
	DictionaryScope,
	DictionaryType,
	PartialDictionaryEntry,
	SearchQuery,
} from '../dictionary.ts';

class DictionarDeSinonime extends Dictionary {
	scope = DictionaryScope.MONOLINGUAL;
	types = [DictionaryType.DEFINING, DictionaryType.SYNONYM];
	languages = ['romanian'];

	query = (query: SearchQuery) =>
		`https://www.dictionardesinonime.ro/?c=${query.word}`;

	async lookup(word: string): Promise<PartialDictionaryEntry> {
		const response = await fetch(this.query({ word }));
		const content = await response.text();
		const $ = cheerio.load(content);

		const definitions = $('#content > div.content_page_simple > span')
			.toArray();

		for (const definition of definitions) {
			const content = $(definition).text();

			if (!content.startsWith(`${word.toUpperCase()} `)) continue;

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
	}
}

/** Converts cedillas to commas, in line with the standard Romanian orthography. */
function uniformise(target: string): string {
	return target
		.replaceAll('ş', 'ș')
		.replaceAll('ţ', 'ț')
		.replaceAll('Ş', 'Ș')
		.replaceAll('Ţ', 'Ț');
}

export { DictionarDeSinonime };
