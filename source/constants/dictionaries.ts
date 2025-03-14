import type { LearningLanguage } from "logos:constants/languages/learning";

const baseSections = ["sources", "lemma", "language", "partOfSpeech"];
type RequiredDictionarySection = (typeof baseSections)[number];

const sections = [
	"definitions",
	"translations",
	"relations",
	"syllables",
	"pronunciation",
	"rhymes",
	"audio",
	"expressions",
	"examples",
	"frequency",
	"inflection",
	"etymology",
	"notes",
] as const;
type DictionarySection = (typeof sections)[number];

const searchModes = [
	"word",
	"meaning",
	"expressions",
	"inflection",
	"etymology",
	"pronunciation",
	"relations",
	"examples",
] as const;
type DictionarySearchMode = (typeof searchModes)[number];

const allowedSectionsBySearchMode: Record<DictionarySearchMode, DictionarySection[]> = Object.freeze({
	word: [...sections],
	meaning: ["definitions", "translations"],
	expressions: ["expressions"],
	inflection: ["inflection"],
	etymology: ["etymology"],
	pronunciation: ["syllables", "pronunciation", "rhymes", "audio"],
	relations: ["relations"],
	examples: ["examples"],
});

function getAllowedDictionarySections(sections: DictionarySearchMode): DictionarySection[] {
	return allowedSectionsBySearchMode[sections];
}

const searchModeSigils: Record<DictionarySearchMode, string[]> = {
	word: ["w", "word"],
	meaning: ["m", "me", "mean", "meaning"],
	inflection: ["i", "in", "inf", "inflect", "inflection"],
	expressions: ["x", "ex", "exp", "expr", "express", "expression", "expressions"],
	etymology: ["e", "et", "ety", "etym", "etymology"],
	pronunciation: ["p", "pr", "pro", "pronounce"],
	relations: ["r", "re", "rel", "relate", "relation"],
	examples: ["s", "sa", "sam", "sample"],
};

const searchModeBySigil: Record<string, DictionarySearchMode> = Object.fromEntries(
	Object.entries(searchModeSigils).flatMap(([mode, sigils]) =>
		sigils.map((sigil) => [sigil, mode as DictionarySearchMode]),
	),
);

function getSearchModeBySigil(sigil: string): DictionarySearchMode | undefined {
	return searchModeBySigil[sigil];
}

type Dictionary = "dexonline" | "dicolink" | "wiktionary" | "wordnik" | "words-api";

const dictionariesByLanguage: Record<LearningLanguage, Dictionary[]> = Object.freeze({
	"Armenian/Eastern": ["wiktionary"],
	"Armenian/Western": ["wiktionary"],
	Danish: ["wiktionary"],
	Dutch: ["wiktionary"],
	"English/American": ["wiktionary", "wordnik", "words-api"],
	"English/British": ["wiktionary", "wordnik", "words-api"],
	Finnish: ["wiktionary"],
	French: ["dicolink", "wiktionary"],
	German: ["wiktionary"],
	Greek: ["wiktionary"],
	Hungarian: ["wiktionary"],
	"Norwegian/Bokmal": ["wiktionary"],
	Polish: ["wiktionary"],
	Romanian: ["dexonline", "wiktionary"],
	Russian: ["wiktionary"],
	Silesian: ["wiktionary"],
	Spanish: ["wiktionary"],
	Swedish: ["wiktionary"],
	Turkish: ["wiktionary"],
	Abkhazian: ["wiktionary"],
	Afar: ["wiktionary"],
	Afrikaans: ["wiktionary"],
	Akan: ["wiktionary"],
	Albanian: ["wiktionary"],
	Amharic: ["wiktionary"],
	Arabic: ["wiktionary"],
	Assamese: ["wiktionary"],
	Aymara: ["wiktionary"],
	Azerbaijani: ["wiktionary"],
	Bashkir: ["wiktionary"],
	Basque: ["wiktionary"],
	Belarusian: ["wiktionary"],
	Bengali: ["wiktionary"],
	Bihari: ["wiktionary"],
	Bislama: ["wiktionary"],
	Breton: ["wiktionary"],
	Bulgarian: ["wiktionary"],
	Burmese: ["wiktionary"],
	Catalan: ["wiktionary"],
	Cherokee: ["wiktionary"],
	Chewa: ["wiktionary"],
	"Chinese/Simplified": ["wiktionary"],
	"Chinese/Traditional": ["wiktionary"],
	Corsican: ["wiktionary"],
	"Creole/Haitian": ["wiktionary"],
	"Creole/Mauritian": ["wiktionary"],
	"Creole/SierraLeone": ["wiktionary"],
	"Creole/Seychellois": ["wiktionary"],
	CzechoSlovak: ["wiktionary"],
	"CzechoSlovak/Czech": ["wiktionary"],
	"CzechoSlovak/Slovak": ["wiktionary"],
	Dholuo: ["wiktionary"],
	Dzongkha: ["wiktionary"],
	English: ["wiktionary"],
	Esperanto: ["wiktionary"],
	Estonian: ["wiktionary"],
	Ewe: ["wiktionary"],
	Faroese: ["wiktionary"],
	Fijian: ["wiktionary"],
	"Filipino/Cebuano": ["wiktionary"],
	"Filipino/Kapampangan": ["wiktionary"],
	"Filipino/Tagalog": ["wiktionary"],
	"Filipino/Waray": ["wiktionary"],
	Frisian: ["wiktionary"],
	Ga: ["wiktionary"],
	Galician: ["wiktionary"],
	Ganda: ["wiktionary"],
	Georgian: ["wiktionary"],
	Greenlandic: ["wiktionary"],
	Guarani: ["wiktionary"],
	Gujarati: ["wiktionary"],
	Hausa: ["wiktionary"],
	Hawaiian: ["wiktionary"],
	Hebrew: ["wiktionary"],
	Hindi: ["wiktionary"],
	Hmong: ["wiktionary"],
	Icelandic: ["wiktionary"],
	Igbo: ["wiktionary"],
	Indonesian: ["wiktionary"],
	Interlingua: ["wiktionary"],
	Interlingue: ["wiktionary"],
	Inuktitut: ["wiktionary"],
	Inupiak: ["wiktionary"],
	Irish: ["wiktionary"],
	Italian: ["wiktionary"],
	Japanese: ["wiktionary"],
	Javanese: ["wiktionary"],
	Kannada: ["wiktionary"],
	Kashmiri: ["wiktionary"],
	Kazakh: ["wiktionary"],
	Khasi: ["wiktionary"],
	Khmer: ["wiktionary"],
	Korean: ["wiktionary"],
	Kurdish: ["wiktionary"],
	Kyrgyz: ["wiktionary"],
	Lao: ["wiktionary"],
	Latin: ["wiktionary"],
	Latvian: ["wiktionary"],
	Limbu: ["wiktionary"],
	Lingala: ["wiktionary"],
	Lithuanian: ["wiktionary"],
	Lozi: ["wiktionary"],
	LubaLulua: ["wiktionary"],
	Luxembourgish: ["wiktionary"],
	Macedonian: ["wiktionary"],
	Malagasy: ["wiktionary"],
	Malay: ["wiktionary"],
	Malayalam: ["wiktionary"],
	Maldivian: ["wiktionary"],
	Maltese: ["wiktionary"],
	Manx: ["wiktionary"],
	Maori: ["wiktionary"],
	Marathi: ["wiktionary"],
	Mongolian: ["wiktionary"],
	Nauru: ["wiktionary"],
	Nepali: ["wiktionary"],
	Newar: ["wiktionary"],
	"Norwegian/Nynorsk": ["wiktionary"],
	Occitan: ["wiktionary"],
	Odia: ["wiktionary"],
	Oromo: ["wiktionary"],
	Ossetian: ["wiktionary"],
	Pashto: ["wiktionary"],
	Pedi: ["wiktionary"],
	Persian: ["wiktionary"],
	"Portuguese/European": ["wiktionary"],
	Punjabi: ["wiktionary"],
	Quechua: ["wiktionary"],
	Rajasthani: ["wiktionary"],
	"RwandaRundi/Kinyarwanda": ["wiktionary"],
	"RwandaRundi/Kirundi": ["wiktionary"],
	Samoan: ["wiktionary"],
	Sango: ["wiktionary"],
	Sanskrit: ["wiktionary"],
	Scots: ["wiktionary"],
	ScottishGaelic: ["wiktionary"],
	"SerboCroatian/Bosnian": ["wiktionary"],
	"SerboCroatian/Croatian": ["wiktionary"],
	"SerboCroatian/Montenegrin": ["wiktionary"],
	"SerboCroatian/Serbian": ["wiktionary"],
	Shona: ["wiktionary"],
	Sindhi: ["wiktionary"],
	Sinhala: ["wiktionary"],
	Slovenian: ["wiktionary"],
	Somali: ["wiktionary"],
	"Sotho/Southern": ["wiktionary"],
	Sundanese: ["wiktionary"],
	Swahili: ["wiktionary"],
	Swazi: ["wiktionary"],
	Syriac: ["wiktionary"],
	Tajik: ["wiktionary"],
	Tamil: ["wiktionary"],
	Tatar: ["wiktionary"],
	Telugu: ["wiktionary"],
	Thai: ["wiktionary"],
	Tibetan: ["wiktionary"],
	Tigrinya: ["wiktionary"],
	Tonga: ["wiktionary"],
	Tsonga: ["wiktionary"],
	Tswana: ["wiktionary"],
	Tumbuka: ["wiktionary"],
	Turkmen: ["wiktionary"],
	Twi: ["wiktionary"],
	Ukrainian: ["wiktionary"],
	Urdu: ["wiktionary"],
	Uyghur: ["wiktionary"],
	Uzbek: ["wiktionary"],
	Venda: ["wiktionary"],
	Vietnamese: ["wiktionary"],
	Volapuk: ["wiktionary"],
	Welsh: ["wiktionary"],
	Wolof: ["wiktionary"],
	Xhosa: ["wiktionary"],
	Yiddish: ["wiktionary"],
	Yoruba: ["wiktionary"],
	Zhuang: ["wiktionary"],
	Zulu: ["wiktionary"],
	Berber: ["wiktionary"],
	Klingon: ["wiktionary"],
	"Arabic/Egyptian": ["wiktionary"],
	Aragonese: ["wiktionary"],
	Armenian: ["wiktionary"],
	Asturian: ["wiktionary"],
	Avar: ["wiktionary"],
	"Azerbaijani/Southern": ["wiktionary"],
	Bavarian: ["wiktionary"],
	"Bikol/Central": ["wiktionary"],
	Bishnupriya: ["wiktionary"],
	"Buriat/Russian": ["wiktionary"],
	Chavacano: ["wiktionary"],
	Chechen: ["wiktionary"],
	Chinese: ["wiktionary"],
	"Chinese/Wu": ["wiktionary"],
	"Chinese/Yue": ["wiktionary"],
	Chuvash: ["wiktionary"],
	Cornish: ["wiktionary"],
	Dotyali: ["wiktionary"],
	"Emiliano-Romagnolo": ["wiktionary"],
	Erzya: ["wiktionary"],
	"Filipino/Ilocano": ["wiktionary"],
	"Frisian/Northern": ["wiktionary"],
	"Frisian/Western": ["wiktionary"],
	"German/Low": ["wiktionary"],
	"German/Swiss": ["wiktionary"],
	"Hindi/Fijian": ["wiktionary"],
	Ido: ["wiktionary"],
	"Italian/Neapolitan": ["wiktionary"],
	"Italian/Venetian": ["wiktionary"],
	Kalmyk: ["wiktionary"],
	"Karachay-Balkar": ["wiktionary"],
	Komi: ["wiktionary"],
	"Konkani/Goan": ["wiktionary"],
	"Kurdish/Northern": ["wiktionary"],
	Lezgian: ["wiktionary"],
	Limburgish: ["wiktionary"],
	Lojban: ["wiktionary"],
	Lombard: ["wiktionary"],
	"Luri/Northern": ["wiktionary"],
	Maithili: ["wiktionary"],
	"Mari/Eastern": ["wiktionary"],
	"Mari/Western": ["wiktionary"],
	Mazanderani: ["wiktionary"],
	Minangkabau: ["wiktionary"],
	Mingrelian: ["wiktionary"],
	Mirandese: ["wiktionary"],
	Nahuatl: ["wiktionary"],
	Norwegian: ["wiktionary"],
	Pfaelzisch: ["wiktionary"],
	Piedmontese: ["wiktionary"],
	Portuguese: ["wiktionary"],
	"Punjabi/Western": ["wiktionary"],
	Romansh: ["wiktionary"],
	Rusyn: ["wiktionary"],
	Sardinian: ["wiktionary"],
	SerboCroatian: ["wiktionary"],
	Sicilian: ["wiktionary"],
	"Sorbian/Lower": ["wiktionary"],
	"Sorbian/Upper": ["wiktionary"],
	Tuvinian: ["wiktionary"],
	Veps: ["wiktionary"],
	Vlaams: ["wiktionary"],
	Walloon: ["wiktionary"],
	Yakut: ["wiktionary"],
	Zaza: ["wiktionary"],
	"Portuguese/Brazilian": ["wiktionary"],
	Bambara: ["wiktionary"],
	Bhojpuri: ["wiktionary"],
	Dogri: ["wiktionary"],
	Filipino: ["wiktionary"],
	Konkani: ["wiktionary"],
	"Kurdish/Sorani": ["wiktionary"],
	Meitei: ["wiktionary"],
	Mizo: ["wiktionary"],
	"Sotho/Northern": ["wiktionary"],
	"Arabic/Emirati": ["wiktionary"],
	"Arabic/SaudiArabian": ["wiktionary"],
	"Catalan/Valencian": ["wiktionary"],
	"English/Australian": ["wiktionary"],
	"French/Canadian": ["wiktionary"],
	"French/French": ["wiktionary"],
	"Spanish/Mexican": ["wiktionary"],
	"Spanish/Spanish": ["wiktionary"],
	"Spanish/American": ["wiktionary"],
	Abkhaz: ["wiktionary"],
	Acehnese: ["wiktionary"],
	Acholi: ["wiktionary"],
	Alur: ["wiktionary"],
	Awadhi: ["wiktionary"],
	Balinese: ["wiktionary"],
	Baluchi: ["wiktionary"],
	Baoule: ["wiktionary"],
	"Batak/Karo": ["wiktionary"],
	"Batak/Simalungun": ["wiktionary"],
	"Batak/Toba": ["wiktionary"],
	Bemba: ["wiktionary"],
	"Berber/Tifinagh": ["wiktionary"],
	Betawi: ["wiktionary"],
	Buryat: ["wiktionary"],
	Cantonese: ["wiktionary"],
	Chamorro: ["wiktionary"],
	Chuukese: ["wiktionary"],
	CrimeanTatar: ["wiktionary"],
	Dari: ["wiktionary"],
	Dinka: ["wiktionary"],
	Dombe: ["wiktionary"],
	Dyula: ["wiktionary"],
	"Filipino/Bikol": ["wiktionary"],
	"Filipino/Pangasinan": ["wiktionary"],
	Fon: ["wiktionary"],
	Friulian: ["wiktionary"],
	Fulani: ["wiktionary"],
	HakhaChin: ["wiktionary"],
	Hiligaynon: ["wiktionary"],
	Hunsrik: ["wiktionary"],
	Iban: ["wiktionary"],
	JamaicanPatois: ["wiktionary"],
	Jingpo: ["wiktionary"],
	Kanuri: ["wiktionary"],
	Kiga: ["wiktionary"],
	Kikongo: ["wiktionary"],
	Kituba: ["wiktionary"],
	Kokborok: ["wiktionary"],
	Latgalian: ["wiktionary"],
	Ligurian: ["wiktionary"],
	Luo: ["wiktionary"],
	Madurese: ["wiktionary"],
	Makassar: ["wiktionary"],
	"Malay/Jawi": ["wiktionary"],
	Mam: ["wiktionary"],
	Mari: ["wiktionary"],
	Marshallese: ["wiktionary"],
	Marwadi: ["wiktionary"],
	Minang: ["wiktionary"],
	Ndau: ["wiktionary"],
	"Ndebele/Southern": ["wiktionary"],
	Nko: ["wiktionary"],
	Nuer: ["wiktionary"],
	Papiamento: ["wiktionary"],
	Qeqchi: ["wiktionary"],
	Romani: ["wiktionary"],
	"Sami/Northern": ["wiktionary"],
	Santali: ["wiktionary"],
	Shan: ["wiktionary"],
	Susu: ["wiktionary"],
	Tahitian: ["wiktionary"],
	Tetum: ["wiktionary"],
	Tiv: ["wiktionary"],
	TokPisin: ["wiktionary"],
	Tongan: ["wiktionary"],
	Tulu: ["wiktionary"],
	Tuvan: ["wiktionary"],
	Udmurt: ["wiktionary"],
	Venetian: ["wiktionary"],
	"Mayan/Yucatecan": ["wiktionary"],
	Zapotec: ["wiktionary"],
} as const);

export default Object.freeze({ baseSections, sections, languages: dictionariesByLanguage, searchModes });
export { getAllowedDictionarySections, getSearchModeBySigil };
export type { RequiredDictionarySection, Dictionary, DictionarySection, DictionarySearchMode };
