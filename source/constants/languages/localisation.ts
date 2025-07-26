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
	rost: [
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
	rost: {
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
	} as const satisfies Record<RostLanguage, string>,
} as const);

const localeToLanguage = Object.freeze({
	discord: Object.mirror(languageToLocale.discord),
	rost: Object.mirror(languageToLocale.rost),
});

const locales = Object.freeze(Object.keys(localeToLanguage.rost) as LocalisationLocale[]);

type DiscordLanguage = (typeof languages.discord)[number];
type RostLanguage = (typeof languages.rost)[number];
type LocalisationLanguage = RostLanguage;

type DiscordLocale = (typeof languageToLocale.discord)[keyof typeof languageToLocale.discord];
type RostLocale = (typeof languageToLocale.rost)[keyof typeof languageToLocale.rost];
type LocalisationLocale = RostLocale;

function isDiscordLanguage(language: string): language is DiscordLanguage {
	return language in languageToLocale.discord;
}

function isRostLanguage(language: string): language is RostLanguage {
	return language in languageToLocale.rost;
}

function isLocalisationLanguage(language: string): language is LocalisationLanguage {
	return isRostLanguage(language) || isDiscordLanguage(language);
}

function isDiscordLocale(locale: string): locale is DiscordLocale {
	return locale in localeToLanguage.discord;
}

function isRostLocale(locale: string): locale is RostLocale {
	return locale in localeToLanguage.rost;
}

function isLocalisationLocale(locale: string): locale is LocalisationLocale {
	return isRostLocale(locale) || isDiscordLocale(locale);
}

function getDiscordLocaleByLanguage(language: DiscordLanguage): DiscordLocale {
	return languageToLocale.discord[language];
}

function getRostLocaleByLanguage(language: RostLanguage): RostLocale {
	return languageToLocale.rost[language];
}

function getLocalisationLocaleByLanguage(language: LocalisationLanguage): LocalisationLocale {
	return getRostLocaleByLanguage(language);
}

function getDiscordLanguageByLocale(locale: string | undefined): DiscordLanguage | undefined {
	if (locale === undefined || !(locale in localeToLanguage.discord)) {
		return undefined;
	}

	return localeToLanguage.discord[locale as keyof typeof localeToLanguage.discord];
}

function getRostLanguageByLocale(locale: RostLocale): RostLanguage {
	return localeToLanguage.rost[locale];
}

export {
	getDiscordLocaleByLanguage,
	getRostLocaleByLanguage,
	getDiscordLanguageByLocale,
	getRostLanguageByLocale,
	isDiscordLanguage,
	isDiscordLocale,
	isRostLanguage,
	isRostLocale,
	isLocalisationLanguage,
	isLocalisationLocale,
	getLocalisationLocaleByLanguage,
	languages,
	languageToLocale,
	locales,
};
export type {
	LocalisationLanguage,
	LocalisationLocale as Locale,
	DiscordLanguage,
	RostLanguage,
	DiscordLocale,
	RostLocale,
};
