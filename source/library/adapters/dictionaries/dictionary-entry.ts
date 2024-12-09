import type { DictionarySection, RequiredDictionarySection } from "logos:constants/dictionaries";
import type { LearningLanguage } from "logos:constants/languages/learning";
import type { Licence } from "logos:constants/licences";
import type { PartOfSpeech } from "logos:constants/parts-of-speech";

type LabelledField = {
	labels?: string[];
	value: string;
};

type LemmaField = LabelledField;
type PartOfSpeechField = LabelledField & {
	detected: PartOfSpeech;
};
type MeaningField = LabelledField &
	Partial<{
		relations: RelationField;
		definitions: DefinitionField[];
		expressions: ExpressionField[];
		examples: ExampleField[];
	}>;
type DefinitionField = MeaningField;
type TranslationField = MeaningField;
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
		examples: ExampleField[];
	}>;
type ExampleField = LabelledField & Partial<{ expressions: ExpressionField[] }>;
type FrequencyField = { value: number };
type InflectionField = {
	tabs: Discord.Camelize<Discord.DiscordEmbed>[];
};
type EtymologyField = LabelledField;
type NoteField = LabelledField;

interface DictionaryEntrySource {
	/** Direct link to the lemma page. */
	link: string;

	/** Licence under which information about the lemma was obtained. */
	licence: Licence;
}

interface BaseDictionaryEntry extends Record<RequiredDictionarySection, unknown> {
	/** Sources of information about the lemma. */
	sources: DictionaryEntrySource[];

	/** Topic word of the dictionary entry. */
	lemma: LemmaField;

	/** The language of the word. */
	language: LearningLanguage;

	/** Part of speech of the lemma. */
	partOfSpeech?: PartOfSpeechField;
}

interface DictionaryEntry extends BaseDictionaryEntry, Partial<Record<DictionarySection, unknown>> {
	/** Definitions belonging to the lemma. */
	definitions?: DefinitionField[];

	/** Translations of the lemma. */
	translations?: TranslationField[];

	/** Relations between the lemma and other words. */
	relations?: RelationField;

	/** Syllable composition of the lemma. */
	syllables?: SyllableField;

	/** Pronunciation of the lemma. */
	pronunciation?: PronunciationField;

	/** Rhythmic composition of the lemma. */
	rhymes?: RhymeField;

	/** Audio example of pronunciation of the lemma. */
	audio?: AudioField[];

	/** Expressions featuring the lemma. */
	expressions?: ExpressionField[];

	/** Examples of the lemma used in a sentence. */
	examples?: ExampleField[];

	/** Indication of how frequently the lemma is used. */
	frequency?: FrequencyField;

	/** Inflection of the lemma. */
	inflection?: InflectionField;

	/** Origin of the lemma. */
	etymology?: EtymologyField;

	/** Additional notes on usage, prevalence, etc. */
	notes?: NoteField;
}

export type {
	LemmaField,
	PartOfSpeechField,
	MeaningField,
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
};
