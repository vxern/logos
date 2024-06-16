import {
	type CLDLanguage,
	type CLDLocale,
	type Language as DetectionLanguage,
	type Locale as DetectionLocale,
	type Detector,
	type FastTextLanguage,
	type FastTextLocale,
	type TinyLDLanguage,
	type TinyLDLocale,
	getCLDLanguageByLocale as getCLDDetectionLanguageByLocale,
	getFastTextLanguageByLocale as getFastTextDetectionLanguageByLocale,
	getTinyLDLanguageByLocale as getTinyLDDetectionLanguageByLocale,
	isCLDLocale,
	isFastTextLocale,
	isTinyLDLocale,
} from "logos:constants/languages/detection";
import { type Language as FeatureLanguage, isLanguage as isFeatureLanguage } from "logos:constants/languages/feature";
import {
	type Language as LearningLanguage,
	getLocaleByLanguage as getLocaleByLearningLanguage,
	isLanguage as isLearningLanguage,
	isLocale as isLearningLocale,
} from "logos:constants/languages/learning";
import {
	type DiscordLocale,
	type Locale,
	type Language as LocalisationLanguage,
	getDiscordLocaleByLanguage as getDiscordLocaleByLocalisationLanguage,
	getDiscordLanguageByLocale as getDiscordLocalisationLanguageByLocale,
	getLogosLocaleByLanguage as getLocaleByLocalisationLanguage,
	getLogosLanguageByLocale as getLocalisationLanguageByLocale,
	isDiscordLanguage as isDiscordLocalisationLanguage,
	isLogosLanguage as isLocalisationLanguage,
	languageToLocale as localisationLanguageToLocale,
	languages as localisationLanguages,
} from "logos:constants/languages/localisation";
import {
	type DeepLLanguage,
	type DeepLLocale,
	type GoogleTranslateLanguage,
	type GoogleTranslateLocale,
	type LingvanexLanguage,
	type LingvanexLocale,
	type Language as TranslationLanguage,
	type Locale as TranslationLocale,
	type Translator,
	getDeepLLocaleByLanguage as getDeepLLocaleByTranslationLanguage,
	getDeepLLanguageByLocale as getDeepLTranslationLanguageByLocale,
	getGoogleTranslateLocaleByLanguage as getGoogleTranslateLocaleByTranslationLanguage,
	getGoogleTranslateLanguageByLocale as getGoogleTranslateTranslationLanguageByLocale,
	getLingvanexLocaleByLanguage as getLingvanexLocaleByTranslationLanguage,
	getLingvanexLanguageByLocale as getLingvanexTranslationLanguageByLocale,
	isDeepLLocale,
	isGoogleTranslateLocale,
	isLingvanexLocale,
	isLanguage as isTranslationLanguage,
	languages as translationLanguages,
} from "logos:constants/languages/translation";

const languages = Object.freeze({
	languages: {
		localisation: [
			...new Set<LocalisationLanguage>([...localisationLanguages.discord, ...localisationLanguages.logos]),
		].sort(),
		translation: [
			...new Set<TranslationLanguage>([...translationLanguages.deepl, ...translationLanguages.google]),
		].sort(),
	},
	locales: {
		discord: Object.values(localisationLanguageToLocale.discord) as DiscordLocale[],
	},
});

const translationLanguagesByBaseLanguage = Object.freeze(
	languages.languages.translation.reduce<Record<string, TranslationLanguage[]>>((languages, language) => {
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
	}, {}),
);

type Language = DetectionLanguage | FeatureLanguage | LearningLanguage | LocalisationLanguage | TranslationLanguage;
type BaseLanguage<Language> = Language extends `${infer BaseLanguage}/${string}` ? BaseLanguage : Language;
type WithBaseLanguage<Language> = Language extends BaseLanguage<Language> ? never : Language;

function getBaseLanguage<L extends Language>(language: L): BaseLanguage<L> {
	const baseLanguage = language.split("/").at(0)!;
	return baseLanguage as BaseLanguage<L>;
}

function getFeatureLanguage(language: LocalisationLanguage | LearningLanguage): FeatureLanguage | undefined {
	const baseLanguage = getBaseLanguage(language);

	if (isFeatureLanguage(baseLanguage)) {
		return baseLanguage;
	}

	return undefined;
}

function getTranslationLanguage(language: Language): TranslationLanguage | undefined {
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
	isTranslationLanguage,
	getDeepLLocaleByTranslationLanguage,
	getGoogleTranslateLocaleByTranslationLanguage,
	getDeepLTranslationLanguageByLocale,
	getGoogleTranslateTranslationLanguageByLocale,
	isGoogleTranslateLocale,
	isDeepLLocale,
	isFeatureLanguage,
	getTinyLDDetectionLanguageByLocale,
	isTinyLDLocale,
	getCLDDetectionLanguageByLocale,
	isCLDLocale,
	getTranslationLanguage,
	getFeatureLanguage,
	getBaseLanguage,
	getLingvanexTranslationLanguageByLocale,
	getLingvanexLocaleByTranslationLanguage,
	isLingvanexLocale,
	getFastTextDetectionLanguageByLocale,
	isFastTextLocale,
};
export type {
	Detector,
	Translator,
	LearningLanguage,
	FeatureLanguage,
	LocalisationLanguage,
	TranslationLanguage,
	Language,
	Locale,
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
	WithBaseLanguage,
	LingvanexLanguage,
	LingvanexLocale,
	FastTextLanguage,
	FastTextLocale,
};
