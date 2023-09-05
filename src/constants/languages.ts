import {
	CLDLanguage,
	CLDLocale,
	Language as DetectionLanguage,
	Locale as DetectionLocale,
	TinyLDLanguage,
	TinyLDLocale,
	getCLDLanguageByLocale as getCLDDetectionLanguageByLocale,
	getTinyLDLanguageByLocale as getTinyLDDetectionLanguageByLocale,
	isCLDLocale,
	isTinyLDLocale,
} from "./languages/detection";
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
	DeepLLanguage,
	DeepLLocale,
	GoogleTranslateLanguage,
	GoogleTranslateLocale,
	Language as TranslationLanguage,
	Locale as TranslationLocale,
	getDeepLLanguageByLocale as getDeepLTranslationLanguageByLocale,
	getDeepLLocaleByLanguage as getDeepLLocaleByTranslationLanguage,
	getGoogleTranslateLanguageByLocale as getGoogleTranslateTranslationLanguageByLocale,
	getGoogleTranslateLocaleByLanguage as getGoogleTranslateLocaleByTranslationLanguage,
	isDeepLLocale,
	isGoogleTranslateLocale,
	isLanguage as isTranslationLanguage,
	languages as translationLanguages,
} from "./languages/translation";

type Language = DetectionLanguage | FeatureLanguage | LearningLanguage | LocalisationLanguage | TranslationLanguage;

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

interface Languages<Language extends string> {
	source: Language;
	target: Language;
}

export default {
	languages: {
		localisation: [...new Set([...localisationLanguages.discord, ...localisationLanguages.logos])].sort(),
		translation: [...new Set([...translationLanguages.deepl, ...translationLanguages.google])].sort(),
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
	getGoogleTranslateLocaleByTranslationLanguage,
	getDeepLTranslationLanguageByLocale,
	getGoogleTranslateTranslationLanguageByLocale,
	isGoogleTranslateLocale,
	isDeepLLocale,
	getTinyLDDetectionLanguageByLocale,
	isTinyLDLocale,
	getCLDDetectionLanguageByLocale,
	isCLDLocale,
};
export type {
	LearningLanguage,
	FeatureLanguage,
	LocalisationLanguage,
	TranslationLanguage,
	Language,
	Locale,
	HasVariants,
	GoogleTranslateLanguage,
	DeepLLanguage,
	Languages,
	TranslationLocale,
	DeepLLocale,
	GoogleTranslateLocale,
	TinyLDLanguage,
	TinyLDLocale,
	CLDLanguage,
	CLDLocale,
	DetectionLanguage,
	DetectionLocale,
};
