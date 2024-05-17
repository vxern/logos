import type { PartOfSpeech } from "logos:constants/parts-of-speech";

export default Object.freeze({
	substantiv: "noun",
	"substantiv masculin": "noun",
	"substantiv feminin": "noun",
	"substantiv neutru": "noun",
	"substantiv propriu": "noun",
	verb: "verb",
	adjectiv: "adjective",
	"adjectiv pronominal": "determiner",
	adverb: "adverb",
	prepoziție: "adposition",
	postpoziție: "adposition",
	prefix: "affix",
	postfix: "affix",
	pronume: "pronoun",
	"pronume reflexiv": "pronoun",
	demonstrativ: "determiner",
	conjuncție: "conjunction",
	interjecție: "interjection",
} satisfies Record<string, PartOfSpeech>);
