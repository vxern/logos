import type { Language } from "logos:constants/languages";
import type { LocalisationLanguage } from "logos:constants/languages/localisation";
import type { PartOfSpeech } from "logos:constants/parts-of-speech";
import pluralisers from "logos:constants/transformers/pluralisers";

type TransformerType = "pluralise";
type Transformer = (matchTerm: string, matches: Record<string, string>) => string | undefined;

const localisations = Object.freeze({
	transformers: {
		"Armenian/Western": { pluralise: pluralisers.invariant },
		"Armenian/Eastern": { pluralise: pluralisers.invariant },
		Danish: { pluralise: pluralisers.commonEuropean },
		Dutch: { pluralise: pluralisers.commonEuropean },
		"English/American": { pluralise: pluralisers.commonEuropean },
		"English/British": { pluralise: pluralisers.commonEuropean },
		Finnish: { pluralise: pluralisers.commonEuropean },
		French: { pluralise: pluralisers.commonEuropean },
		German: { pluralise: pluralisers.commonEuropean },
		Greek: { pluralise: pluralisers.commonEuropean },
		Hungarian: { pluralise: pluralisers.invariant },
		"Norwegian/Bokmal": { pluralise: pluralisers.commonEuropean },
		Polish: { pluralise: pluralisers.commonSlavic },
		Romanian: { pluralise: pluralisers.romanian },
		Russian: { pluralise: pluralisers.commonSlavic },
		Silesian: { pluralise: pluralisers.commonSlavic },
		Spanish: { pluralise: pluralisers.commonEuropean },
		Swedish: { pluralise: pluralisers.commonEuropean },
		Turkish: { pluralise: pluralisers.invariant },
	} satisfies Record<LocalisationLanguage, Record<TransformerType, Transformer>>,
	languages: {
		Abkhazian: "languages.abkhazian",
		Afar: "languages.afar",
		Afrikaans: "languages.afrikaans",
		Akan: "languages.akan",
		Albanian: "languages.albanian",
		Amharic: "languages.amharic",
		Arabic: "languages.arabic",
		"Arabic/Egyptian": "languages.arabic.egyptian",
		"Arabic/Emirati": "languages.arabic.emirati",
		"Arabic/SaudiArabian": "languages.arabic.saudiArabian",
		Aragonese: "languages.aragonese",
		Armenian: "languages.armenian",
		"Armenian/Eastern": "languages.armenian.eastern",
		"Armenian/Western": "languages.armenian.western",
		Assamese: "languages.assamese",
		Asturian: "languages.asturian",
		Avar: "languages.avar",
		Aymara: "languages.aymara",
		Azerbaijani: "languages.azerbaijani",
		"Azerbaijani/Southern": "languages.azerbaijani.southern",
		Bambara: "languages.bambara",
		Bashkir: "languages.bashkir",
		Basque: "languages.basque",
		Bavarian: "languages.bavarian",
		Belarusian: "languages.belarusian",
		Bengali: "languages.bengali",
		Berber: "languages.berber",
		Bhojpuri: "languages.bhojpuri",
		Bihari: "languages.bihari",
		"Bikol/Central": "languages.bikol.central",
		Bishnupriya: "languages.bishnupriya",
		Bislama: "languages.bislama",
		Breton: "languages.breton",
		Bulgarian: "languages.bulgarian",
		"Buriat/Russian": "languages.buriat.russian",
		Burmese: "languages.burmese",
		Catalan: "languages.catalan",
		"Catalan/Valencian": "languages.catalan.valencian",
		Chavacano: "languages.chavacano",
		Chechen: "languages.chechen",
		Cherokee: "languages.cherokee",
		Chewa: "languages.chewa",
		Chinese: "languages.chinese",
		"Chinese/Simplified": "languages.chinese.simplified",
		"Chinese/Traditional": "languages.chinese.traditional",
		"Chinese/Wu": "languages.chinese.wu",
		"Chinese/Yue": "languages.chinese.yue",
		Chuvash: "languages.chuvash",
		Cornish: "languages.cornish",
		Corsican: "languages.corsican",
		"Creole/Haitian": "languages.creole.haitian",
		"Creole/Mauritian": "languages.creole.mauritian",
		"Creole/SierraLeone": "languages.creole.sierraLeone",
		"Creole/Seychellois": "languages.creole.seychellois",
		"CzechoSlovak/Czech": "languages.czechoSlovak.czech",
		"CzechoSlovak/Slovak": "languages.czechoSlovak.slovak",
		CzechoSlovak: "languages.czechoSlovak",
		Danish: "languages.danish",
		Dholuo: "languages.dholuo",
		Dogri: "languages.dogri",
		Dotyali: "languages.dotyali",
		Dutch: "languages.dutch",
		Dzongkha: "languages.dzongkha",
		"Emiliano-Romagnolo": "languages.emilianoRomagnolo",
		English: "languages.english",
		"English/American": "languages.english.american",
		"English/Australian": "languages.english.australian",
		"English/British": "languages.english.british",
		Erzya: "languages.erzya",
		Esperanto: "languages.esperanto",
		Estonian: "languages.estonian",
		Ewe: "languages.ewe",
		Faroese: "languages.faroese",
		Fijian: "languages.fijian",
		Filipino: "languages.filipino",
		"Filipino/Cebuano": "languages.filipino.cebuano",
		"Filipino/Ilocano": "languages.filipino.ilocano",
		"Filipino/Kapampangan": "languages.filipino.kapampangan",
		"Filipino/Tagalog": "languages.filipino.tagalog",
		"Filipino/Waray": "languages.filipino.waray",
		Finnish: "languages.finnish",
		French: "languages.french",
		"French/Canadian": "languages.french.canadian",
		"French/French": "languages.french.french",
		Frisian: "languages.frisian",
		"Frisian/Northern": "languages.frisian.northern",
		"Frisian/Western": "languages.frisian.western",
		Ga: "languages.ga",
		Galician: "languages.galician",
		Ganda: "languages.ganda",
		Georgian: "languages.georgian",
		German: "languages.german",
		"German/Low": "languages.german.low",
		"German/Swiss": "languages.german.swiss",
		Greek: "languages.greek",
		Greenlandic: "languages.greenlandic",
		Guarani: "languages.guarani",
		Gujarati: "languages.gujarati",
		Hausa: "languages.hausa",
		Hawaiian: "languages.hawaiian",
		Hebrew: "languages.hebrew",
		Hindi: "languages.hindi",
		"Hindi/Fijian": "languages.hindi.fijian",
		Hmong: "languages.hmong",
		Hungarian: "languages.hungarian",
		Icelandic: "languages.icelandic",
		Ido: "languages.ido",
		Igbo: "languages.igbo",
		Indonesian: "languages.indonesian",
		Interlingua: "languages.interlingua",
		Interlingue: "languages.interlingue",
		Inuktitut: "languages.inuktitut",
		Inupiak: "languages.inupiak",
		Irish: "languages.irish",
		Italian: "languages.italian",
		"Italian/Neapolitan": "languages.italian.neapolitan",
		"Italian/Venetian": "languages.italian.venetian",
		Japanese: "languages.japanese",
		Javanese: "languages.javanese",
		Kalmyk: "languages.kalmyk",
		Kannada: "languages.kannada",
		"Karachay-Balkar": "languages.karachayBalkar",
		Kashmiri: "languages.kashimiri",
		Kazakh: "languages.kazakh",
		Khasi: "languages.khasi",
		Khmer: "languages.khmer",
		Klingon: "languages.klingon",
		Komi: "languages.komi",
		Konkani: "languages.konkani",
		"Konkani/Goan": "languages.konkani.goan",
		Korean: "languages.korean",
		Kurdish: "languages.kurdish",
		"Kurdish/Northern": "languages.kurdish.northern",
		"Kurdish/Sorani": "languages.kurdish.sorani",
		Kyrgyz: "languages.kyrgyz",
		Lao: "languages.lao",
		Latin: "languages.latin",
		Latvian: "languages.latvian",
		Lezgian: "languages.lezgian",
		Limbu: "languages.limbu",
		Limburgish: "languages.limburgish",
		Lingala: "languages.lingala",
		Lithuanian: "languages.lithuanian",
		Lojban: "languages.lojban",
		Lombard: "languages.lombard",
		Lozi: "languages.lozi",
		LubaLulua: "languages.lubaLulua",
		"Luri/Northern": "languages.luri.northern",
		Luxembourgish: "languages.luxembourgish",
		Macedonian: "languages.macedonian",
		Maithili: "languages.maithili",
		Malagasy: "languages.malagasy",
		Malay: "languages.malay",
		Malayalam: "languages.malayalam",
		Maldivian: "languages.maldivian",
		Maltese: "languages.maltese",
		Manx: "languages.manx",
		Maori: "languages.maori",
		Marathi: "languages.marathi",
		"Mari/Eastern": "languages.mari.eastern",
		"Mari/Western": "languages.mari.western",
		Mazanderani: "languages.mazanderani",
		Meitei: "languages.meitei",
		Minangkabau: "languages.minangkabau",
		Mingrelian: "languages.mingrelian",
		Mirandese: "languages.mirandese",
		Mizo: "languages.mizo",
		Mongolian: "languages.mongolian",
		Nahuatl: "languages.nahuatl",
		Nauru: "languages.nauru",
		Nepali: "languages.nepali",
		Newar: "languages.newar",
		Norwegian: "languages.norwegian",
		"Norwegian/Bokmal": "languages.norwegian.bokmal",
		"Norwegian/Nynorsk": "languages.norwegian.nynorsk",
		Occitan: "languages.occitan",
		Odia: "languages.odia",
		Oromo: "languages.oromo",
		Ossetian: "languages.ossetian",
		Pashto: "languages.pashto",
		Pedi: "languages.pedi",
		Persian: "languages.persian",
		Pfaelzisch: "languages.pfaelzisch",
		Piedmontese: "languages.piedmontese",
		Polish: "languages.polish",
		Portuguese: "languages.portuguese",
		"Portuguese/Brazilian": "languages.portuguese.brazilian",
		"Portuguese/European": "languages.portuguese.european",
		Punjabi: "languages.punjabi",
		"Punjabi/Western": "languages.punjabi.western",
		Quechua: "languages.quechua",
		Rajasthani: "languages.rajasthani",
		Romanian: "languages.romanian",
		Romansh: "languages.romansh",
		Russian: "languages.russian",
		Rusyn: "languages.rusyn",
		"RwandaRundi/Kinyarwanda": "languages.rwandaRundi.kinyarwanda",
		"RwandaRundi/Kirundi": "languages.rwandaRundi.kirundi",
		Samoan: "languages.samoan",
		Sango: "languages.sango",
		Sanskrit: "languages.sanskrit",
		Sardinian: "languages.sardinian",
		Scots: "languages.scots",
		ScottishGaelic: "languages.scottishGaelic",
		SerboCroatian: "languages.serboCroatian",
		"SerboCroatian/Bosnian": "languages.serboCroatian.bosnian",
		"SerboCroatian/Croatian": "languages.serboCroatian.croatian",
		"SerboCroatian/Montenegrin": "languages.serboCroatian.montenegrin",
		"SerboCroatian/Serbian": "languages.serboCroatian.serbian",
		Shona: "languages.shona",
		Sicilian: "languages.sicilian",
		Silesian: "languages.silesian",
		Sindhi: "languages.sindhi",
		Sinhala: "languages.sinhala",
		Slovenian: "languages.slovenian",
		Somali: "languages.somali",
		"Sorbian/Lower": "languages.sorbian.lower",
		"Sorbian/Upper": "languages.sorbian.upper",
		"Sotho/Northern": "languages.sotho.northern",
		"Sotho/Southern": "languages.sotho.southern",
		Spanish: "languages.spanish",
		"Spanish/American": "languages.spanish.american",
		"Spanish/Mexican": "languages.spanish.mexican",
		"Spanish/Spanish": "languages.spanish.spanish",
		Sundanese: "languages.sundanese",
		Swahili: "languages.swahili",
		Swazi: "languages.swazi",
		Swedish: "languages.swedish",
		Syriac: "languages.syriac",
		Tajik: "languages.tajik",
		Tamil: "languages.tamil",
		Tatar: "languages.tatar",
		Telugu: "languages.telugu",
		Thai: "languages.thai",
		Tibetan: "languages.tibetan",
		Tigrinya: "languages.tigrinya",
		Tonga: "languages.tonga",
		Tsonga: "languages.tsonga",
		Tswana: "languages.tswana",
		Tumbuka: "languages.tumbuka",
		Turkish: "languages.turkish",
		Turkmen: "languages.turkmen",
		Tuvinian: "languages.tuvinian",
		Twi: "languages.twi",
		Ukrainian: "languages.ukrainian",
		Urdu: "languages.urdu",
		Uyghur: "languages.uyghur",
		Uzbek: "languages.uzbek",
		Venda: "languages.venda",
		Veps: "languages.veps",
		Vietnamese: "languages.vietnamese",
		Vlaams: "languages.vlaams",
		Volapuk: "languages.volapuk",
		Walloon: "languages.walloon",
		Welsh: "languages.welsh",
		Wolof: "languages.wolof",
		Xhosa: "languages.xhosa",
		Yakut: "languages.yakut",
		Yiddish: "languages.yiddish",
		Yoruba: "languages.yoruba",
		Zaza: "languages.zaza",
		Zhuang: "languages.zhuang",
		Zulu: "languages.zulu",
		Abkhaz: "languages.abkhaz",
		Acehnese: "languages.acehnese",
		Acholi: "languages.acholi",
		Alur: "languages.alur",
		Awadhi: "languages.awadhi",
		Balinese: "languages.balinese",
		Baluchi: "languages.baluchi",
		Baoule: "languages.baoule",
		"Batak/Karo": "languages.batak.karo",
		"Batak/Simalungun": "languages.batak.simalungun",
		"Batak/Toba": "languages.batak.toba",
		Bemba: "languages.bemba",
		"Berber/Tifinagh": "languages.berber.tifinagh",
		Betawi: "languages.betawi",
		Buryat: "languages.buryat",
		Cantonese: "languages.cantonese",
		Chamorro: "languages.chamorro",
		Chuukese: "languages.chuukese",
		CrimeanTatar: "languages.crimeanTatar",
		Dari: "languages.dari",
		Dinka: "languages.dinka",
		Dombe: "languages.dombe",
		Dyula: "languages.dyula",
		"Filipino/Bikol": "languages.filipino.bikol",
		"Filipino/Pangasinan": "languages.filipino.pangasinan",
		Fon: "languages.fon",
		Friulian: "languages.friulian",
		Fulani: "languages.fulani",
		HakhaChin: "languages.hakhaChin",
		Hiligaynon: "languages.hiligaynon",
		Hunsrik: "languages.hunsrik",
		Iban: "languages.iban",
		JamaicanPatois: "languages.jamaicanPatois",
		Jingpo: "languages.jingpo",
		Kanuri: "languages.kanuri",
		Kiga: "languages.kiga",
		Kikongo: "languages.kikongo",
		Kituba: "languages.kituba",
		Kokborok: "languages.kokborok",
		Latgalian: "languages.latgalian",
		Ligurian: "languages.ligurian",
		Madurese: "languages.madurese",
		Makassar: "languages.makassar",
		"Malay/Jawi": "languages.malay.jawi",
		Mam: "languages.mam",
		Mari: "languages.mari",
		Marshallese: "languages.marshallese",
		Marwadi: "languages.marwadi",
		Minang: "languages.minang",
		Ndau: "languages.ndau",
		"Ndebele/Southern": "languages.ndebele.southern",
		Nko: "languages.nko",
		Nuer: "languages.nuer",
		Papiamento: "languages.papiamento",
		Qeqchi: "languages.qeqchi",
		Romani: "languages.romani",
		"Sami/Northern": "languages.sami.northern",
		Santali: "languages.santali",
		Shan: "languages.shan",
		Susu: "languages.susu",
		Tahitian: "languages.tahitian",
		Tetum: "languages.tetum",
		Tiv: "languages.tiv",
		TokPisin: "languages.tokPisin",
		Tongan: "languages.tongan",
		Tulu: "languages.tulu",
		Tuvan: "languages.tuvan",
		Udmurt: "languages.udmurt",
		Venetian: "languages.venetian",
		"Mayan/Yucatecan": "languages.mayan.yucatecan",
		Zapotec: "languages.zapotec",
	} satisfies Record<Language, string>,
	partsOfSpeech: {
		noun: "words.noun",
		verb: "words.verb",
		adjective: "words.adjective",
		adverb: "words.adverb",
		adposition: "words.adposition",
		article: "words.article",
		"proper-noun": "words.properNoun",
		letter: "words.letter",
		character: "words.character",
		phrase: "words.phrase",
		idiom: "words.idiom",
		symbol: "words.symbol",
		syllable: "words.syllable",
		numeral: "words.numeral",
		initialism: "words.initialism",
		particle: "words.particle",
		punctuation: "words.punctuation",
		affix: "words.affix",
		pronoun: "words.pronoun",
		determiner: "words.determiner",
		conjunction: "words.conjunction",
		interjection: "words.interjection",
		number: "words.number",
		ambiposition: "words.ambiposition",
		circumposition: "words.circumposition",
		preposition: "words.preposition",
		postposition: "words.postposition",
		circumfix: "words.circumfix",
		classifier: "words.classifier",
		proverb: "words.proverb",
		"punctuation-mark": "words.punctuationMark",
		infix: "words.infix",
		prefix: "words.prefix",
		root: "words.root",
		interfix: "words.interfix",
		suffix: "words.suffix",
		"combining-form": "words.combiningForm",
		"diacritical-mark": "words.diacriticalMark",
		"prepositional-phrase": "words.prepositionalPhrase",
		"han-character": "words.hanCharacter",
		hanzi: "words.hanzi",
		kanji: "words.kanji",
		hanja: "words.hanja",
		romanization: "words.romanization",
		logogram: "words.logogram",
		determinative: "words.determinative",
		contraction: "words.contraction",
		counter: "words.counter",
		ideophone: "words.ideophone",
		participle: "words.participle",
		unknown: "words.unknown",
	} as const satisfies Record<PartOfSpeech, string>,
} as const);

export default localisations;
export type { Transformer, TransformerType };
