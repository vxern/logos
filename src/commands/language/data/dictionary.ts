import { Commands } from '../../../../assets/localisations/commands.ts';
import { localise } from '../../../../assets/localisations/types.ts';
import { DiscordEmbedField } from '../../../../deps.ts';
import { BulletStyles, list } from '../../../formatting.ts';
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
	{ verbose }: { verbose: boolean },
): DiscordEmbedField[] {
	const fields: DiscordEmbedField[] = [];

	if (entry.definitions) {
		const definitionsStringified = stringifyEntries(entry.definitions, BulletStyles.Diamond);
		const definitionsFitted = fitStringsToFieldSize(definitionsStringified, locale, verbose);

		fields.push({
			name: localise(Commands.word.strings.fields.definitions, locale),
			value: definitionsFitted,
		});
	}

	if (entry.expressions) {
		const expressionsStringified = stringifyEntries(entry.expressions, BulletStyles.Arrow);
		const expressionsFitted = fitStringsToFieldSize(expressionsStringified, locale, verbose);

		fields.push({
			name: localise(Commands.word.strings.fields.expressions, locale),
			value: expressionsFitted,
		});
	}

	if (entry.etymologies) {
		fields.push({
			name: localise(Commands.word.strings.fields.etymology, locale),
			value: entry.etymologies.map((etymology) => {
				if (!etymology.tags) {
					return `**${etymology.value}**`;
				}

				if (!etymology.value) {
					return tagsToString(etymology.tags);
				}

				return `${tagsToString(etymology.tags)} **${etymology.value}**`;
			}).join('\n'),
		});
	}

	return fields;
}

function tagsToString(tags: string[]): string {
	return tags.map((tag) => `\`${tag}\``).join(' ');
}

function stringifyEntries(entries: TaggedValue<string>[], bulletStyle: BulletStyles): string[] {
	const entriesStringified = entries.map((entry) => {
		if (!entry.tags) {
			return entry.value;
		}

		return `${tagsToString(entry.tags)} ${entry.value}`;
	});
	const entriesEnlisted = list(entriesStringified, bulletStyle);
	const entriesDelisted = entriesEnlisted.split('\n');

	return entriesDelisted;
}

function fitStringsToFieldSize(
	strings: string[],
	locale: string | undefined,
	verbose: boolean,
): string {
	const overheadString = localise(Commands.word.strings.definitionsOmitted, locale)(strings.length);
	const characterOverhead = overheadString.length + 20;

	const maxCharacterCount = verbose ? 4096 : 1024;

	let characterCount = 0;
	const stringsToDisplay: string[] = [];
	for (const [string, index] of strings.map<[string, number]>((s, i) => [s, i])) {
		characterCount += string.length;

		if (characterCount + (index + 1 === strings.length ? 0 : characterOverhead) >= maxCharacterCount) break;

		stringsToDisplay.push(string);
	}

	const stringsOmitted = strings.length - stringsToDisplay.length;

	let fittedString = stringsToDisplay.join('\n');
	if (stringsOmitted !== 0) {
		fittedString += `\n*${localise(Commands.word.strings.definitionsOmitted, locale)(stringsOmitted)}*`;
	}

	return fittedString;
}

export { DictionaryAdapter, DictionaryProvisions, DictionaryScopes, getEmbedFields };
export type { DictionaryEntry, TaggedValue };
