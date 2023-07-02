import * as Discord from "discordeno";

const supportedLanguages = ["Armenian", "English", "French", "Hungarian", "Polish", "Romanian"] as const;
type Language = typeof supportedLanguages[number];

function typedDefaultLanguage<T extends Language>(language: T): T {
	return language;
}

const defaultLanguage = typedDefaultLanguage("English");

const localeByLanguage: Required<Record<typeof defaultLanguage, `${Discord.Locales}`>> &
	Partial<Record<Language, `${Discord.Locales}`>> = {
	English: "en-GB",
	French: "fr",
	Hungarian: "hu",
	Polish: "pl",
	Romanian: "ro",
};

const defaultLocale = localeByLanguage[defaultLanguage];

const languageByLocale = {
	"en-GB": "English",
	"en-US": "English",
	fr: "French",
	hu: "Hungarian",
	pl: "Polish",
	ro: "Romanian",
} satisfies Partial<Record<Discord.Locales, Language>>;

function getLanguageByLocale(locale: string | undefined): Language | undefined {
	if (locale === undefined || !(locale in languageByLocale)) {
		return undefined;
	}

	return languageByLocale[locale as keyof typeof languageByLocale];
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
