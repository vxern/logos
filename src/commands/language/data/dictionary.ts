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

interface WithTags<T> {
	tags?: string[];
	value: T;
}

interface DictionaryEntry {
	/** The topic word of an entry. */
	word: string;

	/** The definitions of a word entry. */
	definitions?: WithTags<string>[];

	/** The etymologies of a word entry. */
	etymologies?: WithTags<string | undefined>[];
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
	const fields: DiscordEmbedField[] = [];

	if (entry.definitions) {
		const skippedEntriesString = localise(Commands.word.strings.definitionsOmitted, locale)(entry.definitions.length);

		const definitions = entry.definitions.map((definition) => {
			if (!definition.tags) {
				return definition.value;
			}

			return `${tagsToString(definition.tags)} ${definition.value}`;
		});
		const definitionsListed = list(definitions, 'diamond');
		const definitionsDelisted = definitionsListed.split('\n');

		const maxCharacterCount = verbose ? 4096 : 1024;
		let characterCount = verbose ? 0 : skippedEntriesString.length + 20;
		const definitionsToDisplay: string[] = [];
		for (const definition of definitionsDelisted) {
			characterCount += definition.length;

			if (characterCount >= maxCharacterCount) break;
			definitionsToDisplay.push(definition);
		}

		const definitionsOmitted = definitionsDelisted.length - definitionsToDisplay.length;

		let displayString = definitionsToDisplay.join('\n');
		if (definitionsOmitted !== 0) {
			displayString += `\n*${localise(Commands.word.strings.definitionsOmitted, locale)(definitionsOmitted)}*`;
		}

		fields.push({
			name: localise(Commands.word.strings.fields.definitions, locale),
			value: displayString,
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

export { DictionaryAdapter, DictionaryProvisions, DictionaryScopes, getEmbedFields };
export type { DictionaryEntry, WithTags };
