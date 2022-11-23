import { DiscordEmbedField } from 'discordeno';
import { Language } from 'logos/types.ts';

enum DictionaryScopes {
	/** Provides definitions in the same language as the headword. */
	Monolingual,

	/** Provides definitions in the same + a different language to the headword. */
	Bilingual,

	/** Provides definitions in the same + multiple different languages to the headword. */
	Multilingual,

	/** The dictionary provides definitions in a very large number of different languages to the headword. */
	Omnilingual,
}

enum DictionaryProvisions {
	/** Provides definitions to a word. */
	Definitions,

	/** Provides a word's etymology. */
	Etymology,
}

interface TaggedValue<T> {
	tags?: string[];
	value: T;
}

// deno-lint-ignore no-empty-interface
interface Expression extends TaggedValue<string> {}

interface Definition extends TaggedValue<string> {
	expressions?: Expression[];
}

// deno-lint-ignore no-empty-interface
interface Etymology extends TaggedValue<string | undefined> {}

enum WordTypes {
	Noun,
	Verb,
	Adjective,
	Adverb,
	Adposition,
	Affix,
	Pronoun,
	Determiner,
	Conjunction,
	Interjection,
	Unknown,
}

type InflectionTable = { title: string; fields: DiscordEmbedField[] }[];

interface DictionaryEntry {
	/** The topic word of an entry. */
	word: string;

	/** The string to display as the title of this entry. */
	title?: string;

	/** The type of a word. */
	type?: [WordTypes, string];

	/** The definitions of a word entry. */
	definitions?: Definition[];

	/** The expressions of a word entry. */
	expressions?: Expression[];

	/** The etymologies of a word entry. */
	etymologies?: Etymology[];

	/** The inflection of a word entry. */
	inflectionTable?: InflectionTable;
}

abstract class DictionaryAdapter<T> {
	abstract readonly supports: Language[];
	abstract readonly provides: DictionaryProvisions[];

	abstract readonly query: (word: string, language: Language) => Promise<T | undefined>;
	abstract readonly parse: (contents: T, locale: string | undefined) => DictionaryEntry[] | undefined;
}

export { DictionaryAdapter, DictionaryProvisions, DictionaryScopes, WordTypes };
export type { DictionaryEntry, TaggedValue };
