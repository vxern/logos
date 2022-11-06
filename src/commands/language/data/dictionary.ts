import { Language } from '../../../types.ts';

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

interface Expression extends TaggedValue<string> {}

interface Definition extends TaggedValue<string> {
	expressions?: Expression[];
}

interface Etymology extends TaggedValue<string | undefined> {}

interface DictionaryEntry {
	/** The topic word of an entry. */
	word: string;

	/** The definitions of a word entry. */
	definitions?: Definition[];

	/** The expressions of a word entry. */
	expressions?: Expression[];

	/** The etymologies of a word entry. */
	etymologies?: Etymology[];
}

abstract class DictionaryAdapter<T = string> {
	abstract readonly supports: Language[];
	abstract readonly provides: DictionaryProvisions[];

	abstract readonly query: (word: string, language: Language) => Promise<T | undefined>;
	abstract readonly parse: (contents: T) => DictionaryEntry[] | undefined;
}

export { DictionaryAdapter, DictionaryProvisions, DictionaryScopes };
export type { DictionaryEntry, TaggedValue };
