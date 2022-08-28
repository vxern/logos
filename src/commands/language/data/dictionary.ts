import { DiscordEmbedField } from '../../../../deps.ts';
import { Language } from '../../../types.ts';

/** The language scope / audience of the dictionary. */
enum DictionaryScopes {
	/**
	 * The dictionary provides definitions in the same language as the headword.
	 */
	Monolingual,

	/**
	 * The dictionary provides definitions in a different language to the
	 * headword.
	 */
	Bilingual,

	/**
	 * The dictionary provides definitions in multiple different languages to
	 * the headword.
	 */
	Multilingual,

	/**
	 * The dictionary provides definitions in a very large number of different
	 * languages to the headword.
	 */
	Omnilingual,
}

/** The type of the dictionary. */
enum DictionaryTypes {
	/** The dictionary furnishes definitions to the headword. */
	Defining,

	/** The dictionary furnishes the headword's etymology. */
	Etymological,

	/** The dictionary furnishes the pronunciation of the headword. */
	Phonetic,

	/** The dictionary furnishes synonyms of the headword in the language. */
	Synonym,

	/** The dictionary furnishes antonyms of the headword in the language. */
	Antonym,
}

/** Defines the content of a dictionary entry. */
interface DictionaryEntryContent {
	/** Translations of the entry. */
	translations?: string[];

	/** The pronunciation of the headword. */
	pronunciation?: string;

	/** The definition of the entry. */
	definition?: string;

	/** The etymology of the headword. */
	etymology?: string;

	/** Synonyms of the headword. */
	synonyms?: string[];

	/** Antonyms of the headword. */
	antonyms?: string[];
}

/** Represents a headword entry in a dictionary. */
type DictionaryEntry = DictionaryEntryContent & {
	/** The headword of the entry. */
	headword: string;
};

/**
 * Builds embed fields from a {@link DictionaryEntry} corresponding to the
 * different pieces of data.
 *
 * @param entry - The entry to build fields from.
 * @returns The fields.
 */
function toFields(
	entry: DictionaryEntry,
	{ verbose }: { verbose: boolean },
): DiscordEmbedField[] {
	const fields: Partial<DiscordEmbedField>[] = [{
		name: 'Translation',
		value: entry.translations?.join(', '),
	}, {
		name: 'Pronunciation',
		value: entry.pronunciation,
	}, {
		name: 'Definition',
		value: entry.definition,
	}, {
		name: 'Etymology',
		value: entry.etymology,
	}, {
		name: 'Synonyms',
		value: (verbose ? entry.synonyms : entry.synonyms?.slice(0, 10))?.join(
			', ',
		),
	}, {
		name: 'Antonyms',
		value: (verbose ? entry.antonyms : entry.antonyms?.slice(0, 10))?.join(
			', ',
		),
	}];

	const filled = <DiscordEmbedField[]> fields.filter((field) => field.value);
	const truncated = filled.map((field) => {
		return { ...field, value: field.value.slice(0, verbose ? 1024 : 256) };
	});

	return truncated;
}

/** Represents a search query for  */
interface SearchQuery {
	/** The headword to search for. */
	word: string;

	/** The language of the headword. */
	native?: Language;

	/** The language of the translation or definition. */
	target?: Language;
}

/** Models a URL generator for a given query. */
type QueryBuilder = (query: SearchQuery) => string;

/**
 * Models a dictionary adapter to allow extracting data in a normalised format
 * from various dictionaries.
 */
type DictionaryAdapter = Readonly<
	& {
		/** The types of the dictionary being adapter. */
		types: DictionaryTypes[];

		/** The query builder for a certain term in the dictionary. */
		queryBuilder: QueryBuilder;

		/** Implementation of the method for searching up a term in a dictionary. */
		lookup: (
			query: SearchQuery,
			builder: QueryBuilder,
		) => Promise<DictionaryEntryContent | undefined>;
	}
	& ({
		scope: DictionaryScopes.Omnilingual;
	} | {
		scope: DictionaryScopes.Monolingual;

		languages: [Language];
	} | {
		scope: DictionaryScopes.Bilingual;

		languages: [Language, Language];
	} | {
		scope: DictionaryScopes.Multilingual;

		languages: Language[];
	})
>;

export { DictionaryScopes, DictionaryTypes, toFields };
export type {
	DictionaryAdapter,
	DictionaryEntry,
	DictionaryEntryContent,
	SearchQuery,
};
