const supportedLanguages = [
	'Armenian',
	'English',
	'Belarusian',
	'Romanian',
] as const;
type Language = typeof supportedLanguages[number];
const defaultLanguage: Language = 'English';

export { defaultLanguage, supportedLanguages };
export type { Language };
