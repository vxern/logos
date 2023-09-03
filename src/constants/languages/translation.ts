const languages = {
	deepl: [
		"Bulgarian",
		"Czech",
		"Danish",
		"German",
		"Greek",
		"English/British",
		"English/American",
		"Spanish",
		"Estonian",
		"Finnish",
		"French",
		"Hungarian",
		"Indonesian",
		"Italian",
		"Japanese",
		"Korean",
		"Lithuanian",
		"Latvian",
		"Norwegian",
		"Dutch",
		"Polish",
		"Portuguese/Brazilian",
		"Portuguese/European",
		"Romanian",
		"Russian",
		"Slovak",
		"Slovenian",
		"Swedish",
		"Turkish",
		"Ukrainian",
		"Chinese/Simplified",
	],
} as const;

const languageToLocale = {
	deepl: {
		Bulgarian: "BG",
		Czech: "CS",
		Danish: "DA",
		German: "DE",
		Greek: "EL",
		"English/British": "EN-GB",
		"English/American": "EN-US",
		Spanish: "ES",
		Estonian: "ET",
		Finnish: "FI",
		French: "FR",
		Hungarian: "HU",
		Indonesian: "ID",
		Italian: "IT",
		Japanese: "JA",
		Korean: "KO",
		Lithuanian: "LT",
		Latvian: "LV",
		Norwegian: "NB",
		Dutch: "NL",
		Polish: "PL",
		"Portuguese/Brazilian": "PT-BR",
		"Portuguese/European": "PT-PT",
		Romanian: "RO",
		Russian: "RU",
		Slovak: "SK",
		Slovenian: "SL",
		Swedish: "SV",
		Turkish: "TR",
		Ukrainian: "UK",
		"Chinese/Simplified": "ZH",
	} as const satisfies Record<DeepLLanguage, string>,
} as const;

type DeepLLanguage = typeof languages.deepl[number];
type Language = DeepLLanguage;

type DeepLLocale = typeof languageToLocale.deepl[keyof typeof languageToLocale.deepl];
type Locale = DeepLLocale;

function isLanguage(language: string): language is Language {
	return (languages.deepl as readonly string[]).includes(language);
}

function getDeepLLocaleByLanguage(language: Language): Locale {
	return languageToLocale.deepl[language];
}

export { languages, isLanguage, getDeepLLocaleByLanguage };
export type { Language, Locale };
