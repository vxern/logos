import type { Client } from "logos/client";
import type { DictionarySection, RequiredDictionarySection } from "logos:constants/dictionaries";
import { code } from "logos:constants/formatting";
import type { LearningLanguage } from "logos:constants/languages/learning";
import type { Locale } from "logos:constants/languages/localisation";
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

function isFieldEmpty(field: LabelledField): boolean {
	return (field.labels === undefined || field.labels.length === 0) && field.value.length === 0;
}

function areFieldsEmpty(fields: LabelledField[]): boolean {
	return fields.length === 0 || fields.some((field) => isFieldEmpty(field));
}

function formatLabelledField(field: LabelledField): string {
	if (field.labels === undefined || field.labels.length === 0) {
		return field.value;
	}

	const labels = field.labels.map((label) => code(label)).join(" ");
	if (field.value.length === 0) {
		return labels;
	}

	return `${labels} ${field.value}`;
}

function formatLemmaField(field: LemmaField): string {
	if (field.labels === undefined) {
		return field.value;
	}

	const labels = field.labels.join(", ");

	return `${field.value} (${labels})`;
}

function formatPartOfSpeechField(field: PartOfSpeechField): string {
	if (field.detected !== undefined) {
		return formatLabelledField({ value: field.detected, labels: field.labels });
	}

	return formatLabelledField(field);
}

function formatMeaningFields(
	client: Client,
	fields: MeaningField[],
	{ verbose, locale }: { verbose: boolean; locale: Locale },
	{ depth = 0 }: { depth?: number },
): string[] {
	return fields
		.map((field) => formatMeaningField(client, field, { verbose, locale }, { depth }))
		.map((entry, index) => `${index + 1}. ${entry}`)
		.map((entry) => {
			const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
			return `${whitespace}${entry}`;
		});
}

function formatMeaningField(
	client: Client,
	field: MeaningField,
	{ verbose, locale }: { verbose: boolean; locale: Locale },
	{ depth = 0 }: { depth?: number },
): string {
	let root = formatLabelledField(field);

	if (depth === 0 && !verbose) {
		return root;
	}

	if (field.relations !== undefined) {
		const relations = formatRelationFields(client, field.relations, { locale }, { depth: depth + 2 });
		if (relations !== undefined) {
			root = `${root}\n${relations.join("\n")}`;
		}
	}

	if (field.definitions !== undefined && field.definitions.length > 0) {
		const branch = formatMeaningFields(client, field.definitions, { verbose, locale }, { depth: depth + 1 });

		root = `${root}\n${branch.join("\n")}`;
	}

	if (field.expressions !== undefined && field.expressions.length > 0) {
		const branch = formatExpressionFields(client, field.expressions, { locale }, { depth: depth + 1 });

		root = `${root}\n${branch.join("\n")}`;
	}

	if (field.examples !== undefined && field.examples.length > 0) {
		const branch = formatExampleFields(field.examples, { depth: depth + 1 });

		root = `${root}\n${branch.join("\n")}`;
	}

	return root;
}

function formatExpressionFields(
	client: Client,
	fields: ExpressionField[],
	{ locale }: { locale: Locale },
	{ depth = 0 }: { depth?: number },
): string[] {
	return fields
		.map((field) => formatExpressionField(client, field, { locale }, { depth }))
		.map((entry) => {
			const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
			return `${whitespace}${constants.special.bullet} ${entry}`;
		});
}

function formatExpressionField(
	client: Client,
	field: ExpressionField,
	{ locale }: { locale: Locale },
	{ depth = 0 }: { depth?: number },
): string {
	let root = formatLabelledField({ value: `*${field.value}*`, labels: field.labels });

	if (constants.INCLUDE_EXPRESSION_RELATIONS) {
		if (field.relations !== undefined) {
			const relations = formatRelationFields(client, field.relations, { locale }, { depth: depth + 1 });
			if (relations !== undefined) {
				root = `${root}\n${relations.join("\n")}`;
			}
		}
	}

	if (field.expressions !== undefined && field.expressions.length > 0) {
		const branch = formatExpressionFields(client, field.expressions, { locale }, { depth: depth + 1 });

		root = `${root}\n${branch.join("\n")}`;
	}

	return root;
}

function formatRelationFields(
	client: Client,
	field: RelationField,
	{ locale }: { locale: Locale },
	{ depth = 0 }: { depth?: number },
): string[] | undefined {
	return formatRelationField(client, field, { locale })?.map((entry) => {
		const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
		return `${whitespace}${constants.special.divider} ${entry}`;
	});
}

function formatRelationField(
	client: Client,
	field: RelationField,
	{ locale }: { locale: Locale },
): string[] | undefined {
	const rows: string[] = [];

	// TODO(vxern): Move this into a context file.
	const strings = {
		synonyms: client.localise("word.strings.relations.synonyms", locale)(),
		antonyms: client.localise("word.strings.relations.antonyms", locale)(),
		diminutives: client.localise("word.strings.relations.diminutives", locale)(),
		augmentatives: client.localise("word.strings.relations.augmentatives", locale)(),
	};

	const synonyms = field.synonyms ?? [];
	if (synonyms.length > 0) {
		rows.push(`**${strings.synonyms}**: ${synonyms.join(", ")}`);
	}

	const antonyms = field.antonyms ?? [];
	if (antonyms.length > 0) {
		rows.push(`**${strings.antonyms}**: ${antonyms.join(", ")}`);
	}

	const diminutives = field.diminutives ?? [];
	if (diminutives.length > 0) {
		rows.push(`**${strings.diminutives}**: ${diminutives.join(", ")}`);
	}

	const augmentatives = field.augmentatives ?? [];
	if (augmentatives.length > 0) {
		rows.push(`**${strings.augmentatives}**: ${augmentatives.join(", ")}`);
	}

	if (rows.length === 0) {
		return undefined;
	}

	return rows;
}

function formatPhoneticFields(client: Client, entry: DictionaryEntry, { locale }: { locale: Locale }): string {
	const rows: string[] = [];

	const pronunciationRow: string[] = [];
	if (entry.syllables !== undefined) {
		pronunciationRow.push(formatLabelledField(entry.syllables));
	}

	if (entry.pronunciation !== undefined) {
		pronunciationRow.push(formatLabelledField(entry.pronunciation));
	}

	if (pronunciationRow.length > 0) {
		rows.push(pronunciationRow.join(` ${constants.special.divider} `));
	}

	if (entry.audio !== undefined && entry.audio.length > 0) {
		const strings = {
			audio: client.localise("word.strings.fields.audio", locale)(),
		};

		const audio = entry.audio
			.map((audioField) =>
				formatLabelledField({ value: `[${strings.audio}](${audioField.value})`, labels: audioField.labels }),
			)
			.join(` ${constants.special.dividerShort} `);

		rows.push(audio);
	}

	return rows.map((row) => `${constants.special.bullet} ${row}`).join("\n");
}

function formatExampleFields(fields: ExampleField[], { depth = 0 }: { depth?: number }): string[] {
	return fields
		.map((field) => `> - ${formatLabelledField(field)}`)
		.map((entry) => {
			const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
			return `${whitespace}${entry}`;
		});
}

function formatEtymologyField(field: EtymologyField): string {
	return formatLabelledField(field);
}

function formatNoteField(field: NoteField): string {
	return formatLabelledField(field);
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
export {
	formatLabelledField,
	formatLemmaField,
	formatPartOfSpeechField,
	formatMeaningFields,
	formatExpressionFields,
	formatExpressionField,
	formatRelationFields,
	formatPhoneticFields,
	formatExampleFields,
	formatEtymologyField,
	formatNoteField,
	isFieldEmpty,
	areFieldsEmpty,
};
