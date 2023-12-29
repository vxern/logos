import {
	Language as LocalisationLanguage,
	Locale,
	getLocaleByLanguage as getLocaleByLocalisationLanguage,
	isLanguage as isLocalisationLanguage,
	isLocale as isLocalisationLocale,
} from "./localisation";

type Language = LocalisationLanguage;

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
	} as const satisfies Partial<Record<Language, string>>,
};

type PonsLanguage = keyof typeof languageToLocale.pons;
type PonsLocale = typeof languageToLocale.pons[keyof typeof languageToLocale.pons];

function isPonsLanguage(locale: string): locale is PonsLanguage {
	return locale in languageToLocale.pons;
}

function getPonsLocaleByLanguage(language: PonsLanguage): PonsLocale {
	return languageToLocale.pons[language];
}

function getLocaleByLanguage(language: Language): Locale {
	return getLocaleByLocalisationLanguage(language);
}

function isLanguage(language: string): language is Language {
	return isLocalisationLanguage(language);
}

function isLocale(locale: string): locale is Locale {
	return isLocalisationLocale(locale);
}

export { isPonsLanguage, getPonsLocaleByLanguage, getLocaleByLanguage, isLanguage, isLocale };
export type { PonsLanguage, Language, PonsLocale, Locale };
