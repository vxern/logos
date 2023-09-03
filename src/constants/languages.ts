import { Language as FeatureLanguage, isLanguage as isFeatureLanguage } from "./languages/feature";
import { Language as LearningLanguage } from "./languages/learning";
import {
	Language as LocalisationLanguage,
	Locale,
	getDiscordLanguageByLocale as getDiscordLocalisationLanguageByLocale,
	getDiscordLocaleByLanguage as getDiscordLocaleByLocalisationLanguage,
	getLanguageByLocale as getLocalisationLanguageByLocale,
	getLocaleByLanguage as getLocaleByLocalisationLanguage,
	isDiscordLanguage as isDiscordLocalisationLanguage,
	isLanguage as isLocalisationLanguage,
	languageToLocale as localisationLanguageToLocale,
	languages as localisationLanguages,
} from "./languages/localisation";
import {
	Language as TranslationLanguage,
	getDeepLLocaleByLanguage as getDeepLLocaleByTranslationLanguage,
	isLanguage as isTranslationLanguage,
	languages as translationLanguages,
} from "./languages/translation";

type Language = FeatureLanguage | LearningLanguage | LocalisationLanguage | TranslationLanguage;

type HasVariants<T> = T extends `${string}/${string}` ? T : never;

function toFeatureLanguage(language: LocalisationLanguage | LearningLanguage): FeatureLanguage | undefined {
	const baseLanguage = language.split("/").at(0);
	if (baseLanguage === undefined) {
		throw "StateError: Base language unexpectedly undefined when getting feature language.";
	}

	if (isFeatureLanguage(baseLanguage)) {
		return baseLanguage;
	}

	return undefined;
}

export default {
	languages: {
		localisation: [...localisationLanguages.discord, ...localisationLanguages.logos].sort(),
		translation: [...translationLanguages.deepl].sort(),
	},
	locales: {
		discord: Object.values(localisationLanguageToLocale.discord),
	},
};
export {
	getDiscordLocaleByLocalisationLanguage,
	getLocaleByLocalisationLanguage,
	getDiscordLocalisationLanguageByLocale,
	getLocalisationLanguageByLocale,
	isDiscordLocalisationLanguage,
	isLocalisationLanguage,
	toFeatureLanguage,
	isTranslationLanguage,
	getDeepLLocaleByTranslationLanguage,
};
export type {
	LearningLanguage,
	FeatureLanguage,
	LocalisationLanguage,
	TranslationLanguage,
	Language,
	Locale,
	HasVariants,
};
