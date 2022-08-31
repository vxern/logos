const supportedLanguages = [
	'Armenian',
	'English',
	'Belarusian',
	'Romanian',
] as const;
const defaultLanguage = 'English';
type Language = typeof defaultLanguage | typeof supportedLanguages[number];

export { defaultLanguage, supportedLanguages };
export type { Language };
