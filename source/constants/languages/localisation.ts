const languages = Object.freeze({
	discord: [
		"Dutch",
		"Danish",
		"English/American",
		"English/British",
		"Finnish",
		"French",
		"German",
		"Greek",
		"Hungarian",
		"Norwegian/Bokmal",
		"Polish",
		"Romanian",
		"Russian",
		"Spanish",
		"Swedish",
		"Turkish",
	],
	logos: [
		"Armenian/Eastern",
		"Armenian/Western",
		"Danish",
		"Dutch",
		"English/American",
		"English/British",
		"Finnish",
		"French",
		"German",
		"Greek",
		"Hungarian",
		"Norwegian/Bokmal",
		"Polish",
		"Romanian",
		"Russian",
		"Silesian",
		"Spanish",
		"Swedish",
		"Turkish",
	],
} as const);

const languageToLocale = Object.freeze({
	discord: {
		Dutch: "nl",
		Danish: "da",
		"English/American": "en-US",
		"English/British": "en-GB",
		Finnish: "fi",
		French: "fr",
		German: "de",
		Greek: "el",
		Hungarian: "hu",
		"Norwegian/Bokmal": "no",
		Polish: "pl",
		Romanian: "ro",
		Russian: "ru",
		Spanish: "es-ES",
		Swedish: "sv-SE",
		Turkish: "tr",
	} as const satisfies Record<DiscordLanguage, Discord.Locale>,
	logos: {
		"Armenian/Eastern": "hye",
		"Armenian/Western": "hyw",
		Danish: "dan",
		Dutch: "nld",
		"English/American": "eng-US",
		"English/British": "eng-GB",
		Finnish: "fin",
		French: "fra",
		Greek: "ell",
		German: "deu",
		Hungarian: "hun",
		"Norwegian/Bokmal": "nob",
		Polish: "pol",
		Romanian: "ron",
		Russian: "rus",
		Spanish: "spa",
		Silesian: "szl",
		Swedish: "swe",
		Turkish: "tur",
	} as const satisfies Record<LogosLanguage, string>,
} as const);

const localeToLanguage = Object.freeze({
	discord: Object.mirror(languageToLocale.discord),
	logos: Object.mirror(languageToLocale.logos),
});

const locales = Object.freeze(Object.keys(localeToLanguage.logos) as Locale[]);

type DiscordLanguage = (typeof languages.discord)[number];
type LogosLanguage = (typeof languages.logos)[number];
type Language = LogosLanguage;

type DiscordLocale = (typeof languageToLocale.discord)[keyof typeof languageToLocale.discord];
type LogosLocale = (typeof languageToLocale.logos)[keyof typeof languageToLocale.logos];
type Locale = LogosLocale;

function isDiscordLanguage(language: string): language is DiscordLanguage {
	return (languages.discord as readonly string[]).includes(language);
}

function isLogosLanguage(language: string): language is LogosLanguage {
	return (languages.logos as readonly string[]).includes(language);
}

function isLogosLocale(locale: string): locale is LogosLocale {
	return locale in localeToLanguage.logos;
}

function getDiscordLocaleByLanguage(language: DiscordLanguage): DiscordLocale {
	return languageToLocale.discord[language];
}

function getLogosLocaleByLanguage(language: LogosLanguage): LogosLocale {
	return languageToLocale.logos[language];
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

export {
	getDiscordLocaleByLanguage,
	getLogosLocaleByLanguage,
	getDiscordLanguageByLocale,
	getLogosLanguageByLocale,
	isDiscordLanguage,
	isLogosLanguage,
	isLogosLocale,
	languages,
	languageToLocale,
	locales,
};
export type { Language, Locale, DiscordLocale };
