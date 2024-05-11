import {PartOfSpeech} from "logos:constants/parts-of-speech";
import {DictionaryLicence} from "logos:constants/licences";
import {Client} from "logos/client";
import {LearningLanguage} from "logos:constants/languages";

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

    abstract fetch(client: Client, lemma: string, language: LearningLanguage): Promise<DataType | undefined>;

    async getEntries(
        client: Client,
        interaction: Logos.Interaction,
        lemma: string,
        learningLanguage: LearningLanguage,
    ): Promise<DictionaryEntry[] | undefined> {
        const data = await this.fetch(client, lemma, learningLanguage).catch((reason) => {
            client.log.error(`Failed to get results from ${this.name} for lemma '${lemma}' in ${learningLanguage}.`);
            client.log.error(reason);
            return undefined;
        });
        if (data === undefined) {
            return undefined;
        }

        let entries: DictionaryEntry[];
        try {
            entries = this.parse(client, interaction, lemma, learningLanguage, data);
        } catch (exception) {
            client.log.error(`Failed to format results from ${this.name} for lemma '${lemma}' in ${learningLanguage}.`);
            client.log.error(exception);
            return undefined;
        }

        if (entries.length === 0) {
            return undefined;
        }

        return entries;
    }

    abstract parse(
        client: Client,
        interaction: Logos.Interaction,
        lemma: string,
        learningLanguage: LearningLanguage,
        data: DataType,
    ): DictionaryEntry[];
}

export type { Definition, DictionaryEntry, Expression };
export { DictionaryAdapter, DictionaryProvisions };