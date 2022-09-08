const supportedLanguages = [
	'Armenian',
	'English',
	'Belarusian',
	'Romanian',
] as const;

type SupportedLanguage = (typeof supportedLanguages[number])[number];
type Language = typeof supportedLanguages[number];

const defaultLanguage: SupportedLanguage = 'English';

export { defaultLanguage, supportedLanguages };
export type { Language };
