const supportedLanguages = [
	'Armenian',
	'English',
	'Belarusian',
	'Polish',
	'Romanian',
] as const;
type Language = typeof supportedLanguages[number];

function typedDefaultLanguage<T extends Language>(language: T): T {
	return language;
}

const defaultLanguage = typedDefaultLanguage('English');

enum WordTypes {
	Noun,
	Verb,
	Adjective,
	Adverb,
	Adposition,
	Affix,
	Pronoun,
	Determiner,
	Conjunction,
	Interjection,
	Unknown,
}

export { defaultLanguage, supportedLanguages, WordTypes };
export type { Language };
