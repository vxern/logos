import type { WithBaseLanguage } from "logos:constants/languages";
import {
	type Locale,
	type LocalisationLanguage,
	getLocalisationLocaleByLanguage,
	isLocalisationLanguage,
	isLocalisationLocale,
} from "logos:constants/languages/localisation";

type LearningLanguage = LocalisationLanguage;

function isLearningLanguage(language: string): language is LearningLanguage {
	return isLocalisationLanguage(language);
}

function isLearningLocale(locale: string): locale is Locale {
	return isLocalisationLocale(locale);
}

function getLocaleByLearningLanguage(language: LearningLanguage): Locale {
	return getLocalisationLocaleByLanguage(language);
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

export { isLearningLanguage, isLearningLocale, getLocaleByLearningLanguage, getWiktionaryLanguageName };
export type { LearningLanguage };
