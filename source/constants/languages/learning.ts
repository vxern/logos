import type { LearningLanguage, WithBaseLanguage } from "logos:constants/languages";
import {
	type Locale,
	type Language as LocalisationLanguage,
	getLogosLocaleByLanguage as getLocaleByLocalisationLanguage,
	isLogosLanguage as isLocalisationLanguage,
	isLogosLocale as isLocalisationLocale,
} from "logos:constants/languages/localisation";

type Language = LocalisationLanguage;

function isLanguage(language: string): language is Language {
	return isLocalisationLanguage(language);
}

function isLocale(locale: string): locale is Locale {
	return isLocalisationLocale(locale);
}

function getLocaleByLanguage(language: Language): Locale {
	return getLocaleByLocalisationLanguage(language);
}

const wiktionaryLanguageNames = Object.freeze({
	"English/American": "English",
	"English/British": "English",
	"Norwegian/Bokmal": "Norwegian Bokmål",
	"Armenian/Western": "Armenian",
	"Armenian/Eastern": "Armenian",
} satisfies Record<WithBaseLanguage<LearningLanguage>, string>);

function getWiktionaryLanguageName(language: LearningLanguage): string {
	return (wiktionaryLanguageNames as Record<string, string>)[language] ?? language;
}

export { getLocaleByLanguage, isLanguage, isLocale, getWiktionaryLanguageName };
export type { Language };
