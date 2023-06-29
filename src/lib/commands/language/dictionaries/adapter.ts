import { DiscordEmbedField } from "discordeno";
import { PartOfSpeech } from "./parts-of-speech.js";
import { Client } from "../../../client.js";
import { Language } from "../../../../types.js";

enum DictionaryProvisions {
	/** Provides definitions of a lemma. */
	Definitions = "definitions",

	/** Provides a lemma's etymology. */
	Etymology = "etymology",
}

interface TaggedValue<T> {
	tags?: string[];
	value: T;
}

interface Expression extends TaggedValue<string> {}

interface Definition extends TaggedValue<string> {
	definitions?: Definition[];
	expressions?: Expression[];
}

interface Etymology extends TaggedValue<string | undefined> {}

type InflectionTable = { title: string; fields: DiscordEmbedField[] }[];

interface DictionaryEntry {
	/** The topic word of an entry. */
	lemma: string;

	/** The string to display as the title of this entry. */
	title?: string;

	/** The part of speech of the lemma. */
	partOfSpeech: [detected: PartOfSpeech, text: string];

	/** The definitions for the lemma in its native language. */
	nativeDefinitions?: Definition[];

	/** The definitions for the lemma. */
	definitions?: Definition[];

	/** The expressions for the lemma. */
	expressions?: Expression[];

	/** The etymologies for the lemma. */
	etymologies?: Etymology[];

	/** The inflection of the lemma. */
	inflectionTable?: InflectionTable;
}

abstract class DictionaryAdapter<DataType = unknown> {
	abstract readonly name: string;
	abstract readonly supports: Language[];
	abstract readonly provides: DictionaryProvisions[];

	/**
	 * Fetches data about a {@link lemma} in a {@link language}.
	 *
	 * @param lemma - The lemma to fetch data about.
	 * @param language - The language the lemma is in.
	 */
	abstract fetch(lemma: string, language: Language): Promise<DataType | undefined>;

	/**
	 * Gets dictionary entries for a {@link lemma} in a {@link language}, presenting the information in
	 * the given {@link locale}.
	 *
	 * @param lemma - The word to search for entries about.
	 * @param language - The language the lemma is in.
	 * @param client - The client instance to use.
	 * @param locale - The locale to present the dictionary entries in.
	 */
	async getEntries(
		lemma: string,
		language: Language,
		client: Client,
		locale: string | undefined,
	): Promise<DictionaryEntry[] | undefined> {
		const data = await this.fetch(lemma, language).catch((reason) => {
			client.log.error(`Failed to get results from ${this.name} for lemma '${lemma}' in ${language}.`);
			client.log.error(reason);
			return undefined;
		});
		if (data === undefined) {
			return undefined;
		}

		let entries: DictionaryEntry[];
		try {
			entries = this.parse(lemma, data, client, locale);
		} catch (exception) {
			client.log.error(`Failed to format results from ${this.name} for lemma '${lemma}' in ${language}.`);
			client.log.error(exception);
			return undefined;
		}
		if (entries.length === 0) {
			return undefined;
		}

		return entries;
	}

	/**
	 * Taking {@link data}, converts it to {@link DictionaryEntry | dictionary entries}.
	 *
	 * @param lemma - The word the data pertains to.
	 * @param data - The data to parse.
	 * @param client - The client instance to use for localising.
	 * @param locale - The locale to present the dictionary entries in.
	 */
	abstract parse(lemma: string, data: DataType, client: Client, locale: string | undefined): DictionaryEntry[];
}

export type { Definition, DictionaryEntry, Expression };
export { DictionaryAdapter, DictionaryProvisions };
