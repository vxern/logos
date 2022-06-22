import {
	DictionaryAdapter,
	DictionaryScope,
	DictionaryType,
} from '../dictionary.ts';

/** Maps numbers to their superscript variants. */
const superscript = {
	'0': '⁰',
	'1': '¹',
	'2': '²',
	'3': '³',
	'4': '⁴',
	'5': '⁵',
	'6': '⁶',
	'7': '⁷',
	'8': '⁸',
	'9': '⁹',
} as { [key: string]: string };

const adapter: DictionaryAdapter = {
	scope: DictionaryScope.MONOLINGUAL,
	types: [DictionaryType.DEFINING, DictionaryType.ETYMOLOGICAL],
	languages: ['romanian'],

	queryBuilder: (query) => `https://dexonline.ro/definitie/${query.word}/json`,

	lookup: async (query, builder) => {
		const response = await fetch(builder(query));
		if (!response.ok) return undefined;

		const content = await response.text();
		const data = JSON.parse(content);

		const raw = data.definitions[0].internalRep as string;
		const definition = raw
			.replaceAll(' ** ', ' ⬥ ') // Filled diamond
			.replaceAll(' * ', ' ⬦ ') // Diamond outline
			.replaceAll(
				/%.+?%/g,
				(match) => match.substring(1, match.length - 1).split('').join(' '),
			) // Spread letters out
			.replaceAll(
				/\^[0-9]+/g,
				(match) =>
					match.substring(1, match.length).split('').map((number) =>
						superscript[number]!
					).join(''),
			) // Spread letters out
			.replaceAll('#', '__') // Underline
			.replaceAll('@', '**') // Bolden
			.replaceAll('$', '*'); // Italicise

		return { definition: definition };
	},
};

export default adapter;
