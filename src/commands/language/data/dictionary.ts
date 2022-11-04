import { Commands } from '../../../../assets/localisations/commands.ts';
import { localise } from '../../../../assets/localisations/types.ts';
import { DiscordEmbedField } from '../../../../deps.ts';
import { list } from '../../../formatting.ts';
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

interface DictionaryEntry {
	/** The topic word of an entry. */
	word: string;

	/** The definitions for a word entry. */
	definitions?: string[];

	/** The etymology of a word entry. */
	etymology?: string;
}

abstract class DictionaryAdapter<T = string> {
	abstract readonly supports: Language[];
	abstract readonly provides: DictionaryProvisions[];

	abstract readonly query: (word: string, language: Language) => Promise<T | undefined>;
	abstract readonly parse: (contents: T) => DictionaryEntry[] | undefined;
}

/**
 * Builds embed fields from a {@link DictionaryEntry} corresponding to the
 * different pieces of data.
 *
 * @param entry - The entry to build fields from.
 * @returns The fields.
 */
function getEmbedFields(
	entry: DictionaryEntry,
	locale: string | undefined,
	{ verbose }: { verbose: boolean | undefined },
): DiscordEmbedField[] {
	const fields: Partial<DiscordEmbedField>[] = [{
		name: localise(Commands.word.strings.fields.definition, locale),
		value: !entry.definitions ? undefined : list(entry.definitions),
	}, {
		name: localise(Commands.word.strings.fields.etymology, locale),
		value: entry.etymology,
	}];

	const nonEmptyFields = <DiscordEmbedField[]> fields.filter((field) => field.value);
	const truncatedFields = nonEmptyFields.map((field) => {
		return { ...field, value: field.value.slice(0, verbose ? 950 : 512) };
	});

	return truncatedFields;
}

export { DictionaryAdapter, DictionaryProvisions, DictionaryScopes, getEmbedFields };
export type { DictionaryEntry };
