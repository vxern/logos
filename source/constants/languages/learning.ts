import { type WithBaseLanguage, getFeatureLanguage } from "logos:constants/languages";
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

const localeToLanguage = Object.freeze({
	pons: Object.mirror(languageToLocale.pons),
});

const ponsLanguageNames: Record<string, string> = {
	"English/American": "English",
	"English/British": "English",
} satisfies Record<WithBaseLanguage<PonsLanguage>, string>;

type PonsLanguage = keyof typeof languageToLocale.pons;
type PonsLocale = (typeof languageToLocale.pons)[keyof typeof languageToLocale.pons];

function isPonsLanguage(language: string): language is PonsLanguage {
	return language in languageToLocale.pons;
}

function getPonsLanguageName(language: PonsLanguage): string {
	return (ponsLanguageNames as Record<string, string>)[language] ?? language;
}

function isPonsLocale(locale: string): locale is PonsLanguage {
	return locale in localeToLanguage.pons;
}

function getPonsLocaleByLanguage(language: PonsLanguage): PonsLocale {
	return languageToLocale.pons[language];
}

function isSearchMonolingual<SourceLanguage extends LearningLanguage>(
	sourceLanguage: SourceLanguage,
	targetLanguage: LearningLanguage,
): targetLanguage is SourceLanguage {
	if (sourceLanguage === targetLanguage) {
		return true;
	}

	const sourceFeatureLanguage = getFeatureLanguage(sourceLanguage);
	const targetFeatureLanguage = getFeatureLanguage(targetLanguage);

	return sourceFeatureLanguage === targetFeatureLanguage;
}

export {
	isLearningLanguage,
	isLearningLocale,
	getLocaleByLearningLanguage,
	getWiktionaryLanguageName,
	isPonsLanguage,
	getPonsLocaleByLanguage,
	isPonsLocale,
	getPonsLanguageName,
	isSearchMonolingual,
};
export type { LearningLanguage, PonsLanguage, PonsLocale };
