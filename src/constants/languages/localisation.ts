import * as Discord from "@discordeno/bot";
import { reverseObject } from "../../lib/utils";

const languages = {
	discord: [
		"Dutch",
		"English/American",
		"English/British",
		"Finnish",
		"French",
		"German",
		"Greek",
		"Hungarian",
		"Norwegian/Bokmål",
		"Polish",
		"Romanian",
		"Russian",
		"Swedish",
		"Turkish",
	],
	logos: [
		"Armenian/Eastern",
		"Armenian/Western",
		"Dutch",
		"English/American",
		"English/British",
		"Finnish",
		"French",
		"German",
		"Greek",
		"Hungarian",
		"Norwegian/Bokmål",
		"Polish",
		"Romanian",
		"Russian",
		"Silesian",
		"Swedish",
		"Turkish",
	],
} as const;

const languageToLocale = {
	discord: {
		Dutch: "nl",
		"English/American": "en-US",
		"English/British": "en-GB",
		Finnish: "fi",
		French: "fr",
		German: "de",
		Greek: "el",
		Hungarian: "hu",
		"Norwegian/Bokmål": "no",
		Polish: "pl",
		Romanian: "ro",
		Russian: "ru",
		Swedish: "sv-SE",
		Turkish: "tr",
	} satisfies Record<DiscordLanguage, Discord.Locale>,
	logos: {
		"Armenian/Eastern": "hye",
		"Armenian/Western": "hyw",
		Dutch: "nld",
		"English/American": "eng-US",
		"English/British": "eng-GB",
		Finnish: "fin",
		French: "fra",
		Greek: "ell",
		German: "deu",
		Hungarian: "hun",
		"Norwegian/Bokmål": "nob",
		Polish: "pol",
		Romanian: "ron",
		Russian: "rus",
		Silesian: "szl",
		Swedish: "swe",
		Turkish: "tur",
	} as const satisfies Record<LogosLanguage, string>,
};

type DiscordLanguage = typeof languages.discord[number];
type LogosLanguage = typeof languages.logos[number];
type Language = LogosLanguage;

type DiscordLocale = typeof languageToLocale.discord[keyof typeof languageToLocale.discord];
type LogosLocale = typeof languageToLocale.logos[keyof typeof languageToLocale.logos];
type Locale = LogosLocale;

const localeToLanguage = {
	discord: reverseObject(languageToLocale.discord),
	logos: reverseObject(languageToLocale.logos),
};

function isLanguage(language: string): language is Language {
	return isLogosLanguage(language);
}

function getDiscordLocaleByLanguage(language: DiscordLanguage): DiscordLocale {
	return languageToLocale.discord[language];
}

function getLogosLocaleByLanguage(language: LogosLanguage): LogosLocale {
	return languageToLocale.logos[language];
}

function getLocaleByLanguage(language: Language): Locale {
	return getLogosLocaleByLanguage(language);
}

function getDiscordLanguageByLocale(locale: string | undefined): DiscordLanguage | undefined {
	if (locale === undefined || !(locale in localeToLanguage.discord)) {
		return undefined;
	}

	return localeToLanguage.discord[locale as keyof typeof localeToLanguage.discord];
}

function getLogosLanguageByLocale(locale: LogosLocale): LogosLanguage {
	return localeToLanguage.logos[locale];
}

function getLanguageByLocale(locale: Locale): Language {
	return getLogosLanguageByLocale(locale);
}

function isDiscordLanguage(language: string): language is DiscordLanguage {
	return (languages.discord as readonly string[]).includes(language);
}

function isLogosLanguage(language: string): language is LogosLanguage {
	return (languages.logos as readonly string[]).includes(language);
}

export {
	getDiscordLocaleByLanguage,
	getLocaleByLanguage,
	getDiscordLanguageByLocale,
	getLanguageByLocale,
	isDiscordLanguage,
	isLanguage,
	languages,
	languageToLocale,
};
export type { Language, Locale, DiscordLocale };
