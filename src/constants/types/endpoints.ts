export default {
	deepl: {
		translate: "https://api-free.deepl.com/v2/translate",
	},
	dicolink: {
		host: "dicolink.p.rapidapi.com",
		definitions: (lemma: string) => `https://dicolink.p.rapidapi.com/mot/${lemma}/definitions`,
	},
	googleTranslate: {
		host: "google-translator9.p.rapidapi.com",
		translate: "https://google-translator9.p.rapidapi.com/v2",
	},
	lingvanex: {
		host: "lingvanex-translate.p.rapidapi.com",
		translate: "https://lingvanex-translate.p.rapidapi.com/translate",
	},
	pons: {
		entries: "https://api.pons.com/v1/dictionary",
	},
	wordnik: {
		relatedWords: (lemma: string) => `https://api.wordnik.com/v4/word.json/${lemma}/relatedWords`,
	},
	wordsApi: {
		host: "wordsapiv1.p.rapidapi.com",
		word: (lemma: string) => `https://wordsapiv1.p.rapidapi.com/words/${lemma}`,
	},
};
