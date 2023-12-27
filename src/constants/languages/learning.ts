import {
	Language as LocalisationLanguage,
	Locale,
	getLocaleByLanguage as getLocaleByLocalisationLanguage,
	isLanguage as isLocalisationLanguage,
	isLocale as isLocalisationLocale,
} from "./localisation";

type Language = LocalisationLanguage;

function getLocaleByLanguage(language: Language): Locale {
	return getLocaleByLocalisationLanguage(language);
}

function isLanguage(language: string): language is Language {
	return isLocalisationLanguage(language);
}

function isLocale(locale: string): locale is Locale {
	return isLocalisationLocale(locale);
}

export { getLocaleByLanguage, isLanguage, isLocale };
export type { Language };
