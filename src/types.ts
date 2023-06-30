import { Locales } from "discordeno";

const supportedLanguages = ["Armenian", "English", "French", "Hungarian", "Polish", "Romanian"] as const;
type Language = typeof supportedLanguages[number];

function typedDefaultLanguage<T extends Language>(language: T): T {
	return language;
}

const defaultLanguage = typedDefaultLanguage("English");

const localeByLanguage: Required<Record<typeof defaultLanguage, `${Locales}`>> &
	Partial<Record<Language, `${Locales}`>> = {
	English: "en-GB",
	French: "fr",
	Hungarian: "hu",
	Polish: "pl",
	Romanian: "ro",
};

const defaultLocale = localeByLanguage[defaultLanguage];

const languageByLocale: Partial<Record<Locales, Language>> = {
	"en-GB": "English",
	"en-US": "English",
	fr: "French",
	hu: "Hungarian",
	pl: "Polish",
	ro: "Romanian",
};

function getLanguageByLocale(locale: Locales): Language | undefined {
	return languageByLocale[locale];
}

function getLocaleForLanguage(language: Language): typeof localeByLanguage[keyof typeof localeByLanguage] | undefined {
	return localeByLanguage[language];
}

export {
	defaultLanguage,
	defaultLocale,
	getLanguageByLocale,
	getLocaleForLanguage,
	languageByLocale,
	localeByLanguage,
	supportedLanguages,
};
export type { Language };
