import { LearningLanguage } from "logos:constants/languages";
import { DictionaryLicence } from "logos:constants/licences";
import { PartOfSpeech } from "logos:constants/parts-of-speech";
import { Client } from "logos/client";
import { Logger } from "logos/logger";

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

interface Expression extends TaggedValue<string> {}

interface Definition extends TaggedValue<string> {
	definitions?: Definition[];
	expressions?: Expression[];
	relations?: Relations;
}

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
	readonly log: Logger;
	readonly client: Client;
	readonly identifier: string;
	readonly provides: DictionaryProvisions[];
	readonly supports: LearningLanguage[];
	readonly isFallback: boolean;

	constructor(
		client: Client,
		{
			identifier,
			provides,
			supports,
			isFallback = false,
		}: { identifier: string; provides: DictionaryProvisions[]; supports: LearningLanguage[]; isFallback?: boolean },
	) {
		this.log = Logger.create({ identifier, isDebug: client.environment.isDebug });
		this.client = client;
		this.identifier = identifier;
		this.provides = provides;
		this.supports = supports;
		this.isFallback = isFallback;
	}

	async getEntries(
		interaction: Logos.Interaction,
		lemma: string,
		learningLanguage: LearningLanguage,
	): Promise<DictionaryEntry[] | undefined> {
		const data = await this.fetch(lemma, learningLanguage).catch((reason) => {
			this.log.error(`Failed to get results for lemma '${lemma}' in ${learningLanguage}.`);
			this.log.error(reason);
			return undefined;
		});
		if (data === undefined) {
			return undefined;
		}

		let entries: DictionaryEntry[];
		try {
			entries = this.parse(interaction, lemma, learningLanguage, data);
		} catch (exception) {
			this.log.error(`Failed to format results for lemma '${lemma}' in ${learningLanguage}.`);
			this.log.error(exception);
			return undefined;
		}

		if (entries.length === 0) {
			return undefined;
		}

		return entries;
	}

	abstract fetch(lemma: string, learningLanguage: LearningLanguage): Promise<DataType | undefined>;

	abstract parse(
		interaction: Logos.Interaction,
		lemma: string,
		learningLanguage: LearningLanguage,
		data: DataType,
	): DictionaryEntry[];
}

export type { Definition, DictionaryEntry, Expression };
export { DictionaryAdapter, DictionaryProvisions };
