import * as Discord from "discordeno";

const languages = {
	localisation: {
		discord: [
			"English/American",
			"English/British",
			"French",
			"Hungarian",
			"Norwegian/Bokmål",
			"Polish",
			"Romanian",
			"Turkish",
			"Dutch",
			"Greek",
			"Finnish",
		],
		logos: ["Armenian/Western", "Armenian/Eastern"],
	},
	feature: ["Armenian", "English", "Romanian"],
} as const;

type DiscordLanguage = typeof languages.localisation.discord[number];
type LogosLanguage = typeof languages.localisation.logos[number];

type LocalisationLanguage = DiscordLanguage | LogosLanguage;
type FeatureLanguage = typeof languages.feature[number];

const languageToLocale = {
	discord: {
		"English/American": "en-US",
		"English/British": "en-GB",
		French: "fr",
		Hungarian: "hu",
		"Norwegian/Bokmål": "no",
		Polish: "pl",
		Romanian: "ro",
		Turkish: "tr",
		Dutch: "nl",
		Greek: "el",
		Finnish: "fi",
	} satisfies Record<DiscordLanguage, Discord.Locale>,
	logos: {
		Greek: "ell",
		"English/American": "eng-US",
		"English/British": "eng-GB",
		Finnish: "fin",
		French: "fra",
		Hungarian: "hun",
		"Norwegian/Bokmål": "nob",
		"Armenian/Eastern": "hye",
		"Armenian/Western": "hyw",
		Dutch: "nld",
		Polish: "pol",
		Romanian: "ron",
		Turkish: "tur",
	} as const satisfies Record<LocalisationLanguage, string>,
} as const;

type DiscordLocale = typeof languageToLocale.discord[keyof typeof languageToLocale.discord];
type Locale = typeof languageToLocale.logos[keyof typeof languageToLocale.logos];

function getDiscordLocaleByLanguage(language: DiscordLanguage): DiscordLocale {
	return languageToLocale.discord[language];
}

function getLocaleByLanguage(language: LocalisationLanguage): Locale {
	return languageToLocale.logos[language];
}

const localeToLanguage = {
	discord: reverseObject(languageToLocale.discord),
	logos: reverseObject(languageToLocale.logos),
} as const;

function getDiscordLanguageByLocale(locale: string | undefined): DiscordLanguage | undefined {
	if (locale === undefined || !(locale in localeToLanguage.discord)) {
		return undefined;
	}

	return localeToLanguage.discord[locale as keyof typeof localeToLanguage.discord];
}

function getLanguageByLocale(locale: Locale): LocalisationLanguage {
	return localeToLanguage.logos[locale];
}

function isLocalised(language: string): language is LocalisationLanguage {
	return (languages.localisation.logos as readonly string[]).includes(language);
}

function isFeatured(language: string): language is FeatureLanguage {
	return (languages.feature as readonly string[]).includes(language);
}

type Reverse<O extends Record<string, string>> = {
	[K in keyof O as O[K]]: K;
};
function reverseObject<O extends Record<string, string>>(object: O): Reverse<O> {
	const reversed: Partial<Reverse<O>> = {};
	for (const key of Object.keys(object) as (keyof O)[]) {
		// @ts-ignore: This is okay.
		reversed[object[key]] = key;
	}
	return reversed as unknown as Reverse<O>;
}

export {
	getDiscordLocaleByLanguage,
	getLanguageByLocale,
	getDiscordLanguageByLocale,
	getLocaleByLanguage,
	isLocalised,
	isFeatured,
};
export type { FeatureLanguage, LocalisationLanguage, Locale };
