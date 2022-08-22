import {
	DictionaryAdapter,
	DictionaryScopes,
	DictionaryTypes,
} from '../dictionary.ts';

/** Maps numbers to their superscript variants. */
const superscript: Record<string, string> = {
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
};

/** Represents a Dexonline definition entry. */
interface Definition {
	/** The type of this definition. */
	type: string;

	/** The internal ID of this definition. */
	id: string;

	/** The internal representation of the content of this definition. */
	internalRep: string;

	/** The HTML representation of the content of this definition. */
	htmlRep: string;

	/** The username of the user who submitted this definition. */
	userNick: string;

	/** The name of the source from which this definition was taken. */
	sourceName: string;

	/** The creation time of this definition. */
	createDate: string;

	/** The time this definition was last edited at. */
	modDate: string;
}

/** Represents a Dexonline search results object. */
interface SearchResults {
	/** The type of this query. */
	type: string;

	/** The word in question in this query. */
	word: string;

	/** The definitions matched by this query. */
	definitions: Definition[];
}

const adapter: DictionaryAdapter = {
	scope: DictionaryScopes.Monolingual,
	types: [DictionaryTypes.Defining, DictionaryTypes.Etymological],
	languages: ['Romanian'],

	queryBuilder: (query) => `https://dexonline.ro/definitie/${query.word}/json`,

	lookup: async (query, builder) => {
		const response = await fetch(builder(query));
		if (!response.ok) return undefined;

		const content = await response.text();

		const data = <SearchResults> JSON.parse(content);
		if (data.definitions.length === 0) return undefined;

		const definition = data.definitions[0]!.internalRep
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
			.replaceAll('&quot;', '"') // Remove XHTML relics.
			.replaceAll('#', '__') // Underline
			.replaceAll('@', '**') // Bolden
			.replaceAll('$', '*'); // Italicise

		return { definition: definition };
	},
};

export default adapter;
