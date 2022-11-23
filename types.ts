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

export { defaultLanguage, supportedLanguages };
export type { Language };
