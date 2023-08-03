import * as Discord from "discordeno";

const languages = {
	localisation: [
		// Built-in
		...["English", "French", "Hungarian", "Norwegian", "Polish", "Romanian", "Turkish"],
		// Custom
		...["Armenian/Western", "Armenian/Eastern"],
	],
	feature: ["Armenian", "English", "Romanian"],
} as const;
const locales = ["hyw", "hye"] as const;

type LocalisationLanguage = typeof languages.localisation[number];
type FeatureLanguage = typeof languages.feature[number];
type DefaultLanguage = LocalisationLanguage & FeatureLanguage;

type CustomLocale = typeof locales[number];
type Locale = Discord.Locale | CustomLocale;
type DefaultLocale = Discord.Locale;

const mappings = {
	locales: {
		// Built-in
		...({
			English: "en-GB",
			French: "fr",
			Hungarian: "hu",
			Norwegian: "no",
			Polish: "pl",
			Romanian: "ro",
			Turkish: "tr",
		} satisfies Partial<Record<LocalisationLanguage, Discord.Locale>>),
		// Custom
		...({
			"Armenian/Western": "hyw",
			"Armenian/Eastern": "hye",
		} satisfies Partial<Record<LocalisationLanguage, CustomLocale>>),
	} satisfies Record<LocalisationLanguage, Locale>,
	languages: {
		// Built-in
		...({
			"en-GB": "English",
			"en-US": "English",
			fr: "French",
			hu: "Hungarian",
			no: "Norwegian",
			pl: "Polish",
			ro: "Romanian",
			tr: "Turkish",
		} satisfies Partial<Record<Discord.Locale, LocalisationLanguage>>),
		// Custom
		...({
			hyw: "Armenian/Western",
			hye: "Armenian/Eastern",
		} satisfies Record<CustomLocale, LocalisationLanguage>),
	},
};

function getLanguageByLocale(locale: string | undefined): LocalisationLanguage | undefined {
	if (locale === undefined || !(locale in mappings.languages)) {
		return undefined;
	}

	return mappings.languages[locale as keyof typeof mappings.languages];
}

function getLocaleByLanguage(language: LocalisationLanguage): Discord.Locale | undefined {
	const locale = mappings.locales[language];
	if (locale in Discord.Locales) {
		return locale as Discord.Locale;
	}

	return undefined;
}

function isLocalised(language: string): language is LocalisationLanguage {
	return (languages.localisation as readonly string[]).includes(language);
}

function isFeatured(language: string): language is FeatureLanguage {
	return (languages.feature as readonly string[]).includes(language);
}

export { getLanguageByLocale, getLocaleByLanguage, isLocalised, isFeatured };
export type { FeatureLanguage, LocalisationLanguage, Locale, DefaultLanguage, DefaultLocale };
