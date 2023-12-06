import { LearningLanguage } from "../languages";
import { Language as LocalisationLanguage } from "./localisation";

const languageToLocale = {
	pons: {
		"English/American": "en",
		"English/British": "en",
		French: "fr",
		German: "de",
		Greek: "el",
		// "Italian": "it",
		Polish: "pl",
		// "Portuguese": "pt",
		Russian: "ru",
		// "Slovenian": "sl",
		// "Spanish": "es",
		Turkish: "tr",
		// "Chinese": "zh",
	} as const satisfies Partial<Record<LearningLanguage, string>>,
};

type PonsLanguage = keyof typeof languageToLocale.pons;
type Language = LocalisationLanguage;

type PonsLocale = typeof languageToLocale.pons[keyof typeof languageToLocale.pons];
type Locale = PonsLocale;

function isPonsLanguage(locale: string): locale is PonsLanguage {
	return locale in languageToLocale.pons;
}

function getPonsLocaleByLanguage(language: PonsLanguage): PonsLocale {
	return languageToLocale.pons[language];
}

export { isPonsLanguage, getPonsLocaleByLanguage };
export type { PonsLanguage, Language, PonsLocale, Locale };
