import { Languages, LearningLanguage, Locale } from "../../../../../constants/languages";
import { Client } from "../../../../client";
import { DictionaryAdapter } from "../adapter";
import { DictionaryEntry } from "../dictionary-entry";

class TestAdapter extends DictionaryAdapter<
	number,
	| "part-of-speech"
	| "definitions"
	| "translations"
	| "relations"
	| "syllables"
	| "pronunciation"
	| "rhymes"
	| "audio"
	| "expressions"
	| "examples"
	| "frequency"
	| "inflection"
	| "etymology"
	| "notes"
> {
	constructor() {
		super({
			identifier: "Test",
			provides: new Set([
				"part-of-speech",
				"definitions",
				"translations",
				"relations",
				"syllables",
				"pronunciation",
				"rhymes",
				"audio",
				"expressions",
				"examples",
				"frequency",
				"inflection",
				"etymology",
				"notes",
			]),
		});
	}

	async fetch(_: Client, __: string, ___: Languages<LearningLanguage>) {
		return 1;
	}

	parse(_: Client, lemma: string, __: Languages<LearningLanguage>, ___: number, ____: { locale: Locale }) {
		return [
			{
				sources: [
					{
						link: "https://testlink.com",
						licence: {
							name: "Unlicensed",
							link: "https://testlink.com/license",
							notices: { licence: "Test" },
						},
					},
				],
				lemma: { value: lemma },
				partOfSpeech: { value: "noun" },
				definitions: [
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
				],
				translations: [
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
					{ value: "This is a very long definition.".repeat(10) },
				],
				relations: {
					synonyms: ["this", "is", "a", "synonym", "field"],
					antonyms: ["this", "is", "an", "antonym", "field"],
					augmentatives: ["this", "is", "an", "augmentative", "field"],
					diminutives: ["this", "is", "a", "diminutive", "field"],
				},
				syllables: { labels: ["do", "re", "mi"], value: "a|b|c|d|e|f|g" },
				pronunciation: { labels: ["fa", "so", "la"], value: "This is a sample pronunciation." },
				rhymes: { labels: ["si", "do"], value: "This is a sample rhyme set." },
				audio: [
					{ labels: ["do"], value: "https://test.com" },
					{ labels: ["re", "mi"], value: "https://test.com" },
					{ labels: ["fa", "so", "la"], value: "https://test.com" },
				],
				expressions: [
					{ value: "This is an expression." },
					{ value: "This is an expression." },
					{ value: "This is an expression." },
					{ value: "This is an expression." },
					{ value: "This is an expression." },
					{ value: "This is an expression." },
					{ value: "This is an expression." },
					{ value: "This is an expression." },
					{ value: "This is an expression." },
					{ value: "This is an expression." },
				],
				examples: [
					{ value: "This is an example." },
					{ value: "This is an example." },
					{ value: "This is an example." },
					{ value: "This is an example." },
				],
				frequency: { value: 1 },
				inflection: {
					tabs: [
						{
							title: "First page",
							fields: [
								{ name: "Field 1", value: "Value" },
								{ name: "Field 2", value: "Value" },
								{ name: "Field 3", value: "Value" },
								{ name: "Field 4", value: "Value" },
								{ name: "Field 5", value: "Value" },
								{ name: "Field 6", value: "Value" },
							],
						},
						{
							title: "Second page",
							fields: [
								{ name: "Field 1", value: "Value" },
								{ name: "Field 2", value: "Value" },
								{ name: "Field 3", value: "Value" },
							],
						},
						{
							title: "Second page",
							fields: [
								{ name: "Field 1", value: "Value" },
								{ name: "Field 2", value: "Value" },
								{ name: "Field 3", value: "Value" },
								{ name: "Field 4", value: "Value" },
							],
						},
					],
				},
				etymology: { value: "This is a sample etymology.".repeat(10) },
				notes: { value: "This is a sample note.".repeat(10) },
			} satisfies DictionaryEntry,
		];
	}
}

const adapter = new TestAdapter();

export default adapter;
