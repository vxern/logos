import { LearningLanguage, Locale } from "../../../../constants/languages";
import { DictionaryLicence } from "../../../../constants/licences";
import { Client } from "../../../client";
import { PartOfSpeech } from "./part-of-speech";
import * as Discord from "@discordeno/bot";

type DictionaryProvisions =
	/** Provides definitions of a lemma. */
	| "definitions"
	/** Provides a lemma's etymology. */
	| "etymology";

type RelationTypes = "synonym" | "antonym" | "diminutive" | "augmentative";
type Relations = Partial<Record<`${RelationTypes}s`, string[]>>;

interface TaggedValue<T> {
	tags?: string[];
	value: T;
}

// rome-ignore lint/suspicious/noEmptyInterface: Alias.
interface Expression extends TaggedValue<string> {}

interface Definition extends TaggedValue<string> {
	definitions?: Definition[];
	expressions?: Expression[];
	relations?: Relations;
}

// rome-ignore lint/suspicious/noEmptyInterface: Alias.
interface Etymology extends TaggedValue<string | undefined> {}

type InflectionTable = { title: string; fields: Discord.CamelizedDiscordEmbedField[] }[];

interface DictionaryEntry {
	/** The topic word of an entry. */
	lemma: string;

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

	sources: [link: string, licence: DictionaryLicence][];
}

abstract class DictionaryAdapter<DataType = unknown> {
	readonly name: string;
	readonly provides: readonly DictionaryProvisions[];
	readonly isFallback: boolean;

	constructor({
		name,
		provides,
		isFallback = false,
	}: { name: string; provides: readonly DictionaryProvisions[]; isFallback?: boolean }) {
		this.name = name;
		this.provides = provides;
		this.isFallback = isFallback;
	}

	/**
	 * Fetches data about a {@link lemma} in a {@link language}.
	 *
	 * @param client - The client instance to use.
	 * @param lemma - The lemma to fetch data about.
	 * @param language - The language the lemma is in.
	 */
	abstract fetch(client: Client, lemma: string, language: LearningLanguage): Promise<DataType | undefined>;

	/**
	 * Gets dictionary entries for a {@link lemma} in a {@link language}, presenting the information in
	 * the given {@link locale}.
	 *
	 * @param client - The client instance to use.
	 * @param lemma - The word to search for entries about.
	 * @param language - The language the lemma is in.
	 * @param locale - The locale to present the dictionary entries in.
	 */
	async getEntries(
		client: Client,
		lemma: string,
		language: LearningLanguage,
		{ locale }: { locale: Locale },
	): Promise<DictionaryEntry[] | undefined> {
		const data = await this.fetch(client, lemma, language).catch((reason) => {
			client.log.error(`Failed to get results from ${this.name} for lemma '${lemma}' in ${language}.`);
			client.log.error(reason);
			return undefined;
		});
		if (data === undefined) {
			return undefined;
		}

		let entries: DictionaryEntry[];
		try {
			entries = this.parse(client, lemma, language, data, { locale });
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
	 * @param client - The client instance to use for localising.
	 * @param lemma - The word the data pertains to.
	 * @param language - The desired language for the lemma.
	 * @param data - The data to parse.
	 * @param locale - The locale to present the dictionary entries in.
	 */
	abstract parse(
		client: Client,
		lemma: string,
		language: LearningLanguage,
		data: DataType,
		{ locale }: { locale: Locale },
	): DictionaryEntry[];
}

export type { Definition, DictionaryEntry, Expression };
export { DictionaryAdapter, DictionaryProvisions };
