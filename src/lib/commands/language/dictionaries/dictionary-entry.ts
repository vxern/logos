import * as Discord from "@discordeno/bot";
import { DictionaryLicence } from "../../../../constants/licences";
import { PartOfSpeech } from "./part-of-speech";

type LabelledField = {
	labels?: string[];
	value: string;
};

type LemmaField = LabelledField;
type PartOfSpeechField = LabelledField &
	Partial<{
		detected: PartOfSpeech;
	}>;
type DefinitionField = LabelledField &
	Partial<{
		relations: RelationField;
		definitions: DefinitionField[];
		expressions: ExpressionField[];
	}>;
type TranslationField = LabelledField;
type RelationField = Partial<{
	synonyms: string[];
	antonyms: string[];
	diminutives: string[];
	augmentatives: string[];
}>;
type SyllableField = LabelledField;
type PronunciationField = LabelledField;
type AudioField = LabelledField;
type RhymeField = LabelledField;
type ExpressionField = LabelledField &
	Partial<{
		relations: RelationField;
		expressions: ExpressionField[];
	}>;
type ExampleField = LabelledField;
type FrequencyField = { value: number };
type InflectionField = {
	tabs: Discord.CamelizedDiscordEmbed[];
};
type EtymologyField = LabelledField;
type NoteField = LabelledField;

interface DictionaryEntrySource {
	/** Direct link to the lemma page. */
	link: string;

	/** Licence under which information about the lemma was obtained. */
	licence: DictionaryLicence;
}

interface DictionaryEntry {
	/** Sources of information about the lemma. */
	sources: DictionaryEntrySource[];

	/** Topic word of the dictionary entry. */
	lemma: LemmaField;

	/** Part of speech of the lemma. */
	partOfSpeech: PartOfSpeechField;

	/** Definitions belonging to the lemma. */
	definitions: DefinitionField[];

	/** Translations of the lemma. */
	translations: TranslationField[];

	/** Relations between the lemma and other words. */
	relations: RelationField;

	/** Syllable composition of the lemma. */
	syllables: SyllableField;

	/** Pronunciation of the lemma. */
	pronunciation: PronunciationField;

	/** Rhythmic composition of the lemma. */
	rhymes: RhymeField;

	/** Audio example of pronunciation of the lemma. */
	audio: AudioField[];

	/** Expressions featuring the lemma. */
	expressions: ExpressionField[];

	/** Examples of the lemma used in a sentence. */
	examples: ExampleField[];

	/** Indication of how frequently the lemma is used. */
	frequency: FrequencyField;

	/** Inflection of the lemma. */
	inflection: InflectionField;

	/** Origin of the lemma. */
	etymology: EtymologyField;

	/** Additional notes on usage, prevalence, etc. */
	notes: NoteField;
}

type RequiredDictionaryEntryFields = "sources" | "lemma";

export type {
	LemmaField,
	PartOfSpeechField,
	DefinitionField,
	TranslationField,
	RelationField,
	SyllableField,
	PronunciationField,
	RhymeField,
	AudioField,
	ExpressionField,
	ExampleField,
	FrequencyField,
	InflectionField,
	EtymologyField,
	NoteField,
	DictionaryEntrySource,
	DictionaryEntry,
	LabelledField,
	RequiredDictionaryEntryFields,
};