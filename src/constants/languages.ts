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
import {
	Language as LearningLanguage,
	getLocaleByLanguage as getLocaleByLearningLanguage,
	isLanguage as isLearningLanguage,
	isLocale as isLearningLocale,
} from "./languages/learning";
import {
	DiscordLocale,
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
	locales,
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

const languages = {
	languages: {
		localisation: [
			...new Set([...localisationLanguages.discord, ...localisationLanguages.logos]),
		].sort() satisfies LocalisationLanguage[] as LocalisationLanguage[],
		translation: [
			...new Set([...translationLanguages.deepl, ...translationLanguages.google]),
		].sort() satisfies TranslationLanguage[] as TranslationLanguage[],
	},
	locales: {
		discord: Object.values(localisationLanguageToLocale.discord) satisfies DiscordLocale[] as DiscordLocale[],
	},
};

const translationLanguagesByBaseLanguage = languages.languages.translation.reduce<
	Record<string, TranslationLanguage[]>
>((languages, language) => {
	const baseLanguage = getBaseLanguage(language);

	if (baseLanguage === language) {
		return languages;
	}

	if (baseLanguage in languages) {
		languages[baseLanguage]?.push(language);
	} else {
		languages[baseLanguage] = [language];
	}

	return languages;
}, {});

type Language = DetectionLanguage | FeatureLanguage | LearningLanguage | LocalisationLanguage | TranslationLanguage;

type HasVariants<T> = T extends `${string}/${string}` ? T : never;

function getBaseLanguage(language: string): string {
	const baseLanguage = language.split("/").at(0);
	if (baseLanguage === undefined) {
		throw "StateError: Base language unexpectedly undefined when getting feature language.";
	}

	return baseLanguage;
}

function getFeatureLanguage(language: LocalisationLanguage | LearningLanguage): FeatureLanguage | undefined {
	const baseLanguage = getBaseLanguage(language);

	if (isFeatureLanguage(baseLanguage)) {
		return baseLanguage;
	}

	return undefined;
}

function getTranslationLanguage(language: string): TranslationLanguage | undefined {
	if (isTranslationLanguage(language)) {
		return language;
	}

	const baseLanguage = getBaseLanguage(language);
	const otherVariants = translationLanguagesByBaseLanguage[baseLanguage];
	if (otherVariants === undefined) {
		return undefined;
	}

	const otherVariant = otherVariants.at(0);
	if (otherVariant === undefined) {
		return undefined;
	}

	return otherVariant;
}

interface Languages<Language extends string> {
	source: Language;
	target: Language;
}

export default languages;
export {
	getDiscordLocaleByLocalisationLanguage,
	getLocaleByLocalisationLanguage,
	getDiscordLocalisationLanguageByLocale,
	getLocalisationLanguageByLocale,
	isDiscordLocalisationLanguage,
	isLocalisationLanguage,
	getLocaleByLearningLanguage,
	isLearningLanguage,
	isLearningLocale,
	isFeatureLanguage,
	getFeatureLanguage,
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
	getTranslationLanguage,
	getBaseLanguage,
	locales,
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
