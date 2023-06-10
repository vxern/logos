import { DiscordEmbedField } from 'discordeno';
import { WordClass } from 'logos/src/commands/language/commands/word.ts';
import { Client } from 'logos/src/client.ts';
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
	definitions?: Definition[];
	expressions?: Expression[];
}

// deno-lint-ignore no-empty-interface
interface Etymology extends TaggedValue<string | undefined> {}

type InflectionTable = { title: string; fields: DiscordEmbedField[] }[];

interface DictionaryEntry {
	/** The topic word of an entry. */
	word: string;

	/** The string to display as the title of this entry. */
	title?: string;

	/** The word class of the topic word. */
	wordClass?: [wordClass: WordClass, wordClassUnresolved: string];

	/** The definitions for the topic word. */
	definitions?: Definition[];

	/** The expressions for the topic word. */
	expressions?: Expression[];

	/** The etymologies for the topic word. */
	etymologies?: Etymology[];

	/** The inflection of the topic word. */
	inflectionTable?: InflectionTable;
}

abstract class DictionaryAdapter {
	abstract readonly supports: Language[];
	abstract readonly provides: DictionaryProvisions[];

	abstract get(
		client: Client,
		word: string,
		language: Language,
		locale: string | undefined,
	): Promise<DictionaryEntry[] | undefined>;
}

/** Represents a pair of a sentence and its translation. */
interface SentencePair {
	/** The source sentence. */
	sentence: string;

	/** The translation of the sentence. */
	translation: string;
}

export { DictionaryAdapter, DictionaryProvisions, DictionaryScopes };
export type { Definition, DictionaryEntry, Expression, SentencePair, TaggedValue };
