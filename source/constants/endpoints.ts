export default Object.freeze({
	deepl: {
		translate: "https://api-free.deepl.com/v2/translate",
	},
	googleTranslate: {
		host: "google-translator9.p.rapidapi.com",
		translate: "https://google-translator9.p.rapidapi.com/v2",
	},
	lingvanex: {
		host: "lingvanex-translate.p.rapidapi.com",
		translate: "https://lingvanex-translate.p.rapidapi.com/translate",
	},
	wordsApi: {
		host: "wordsapiv1.p.rapidapi.com",
		word: (word: string) => `https://wordsapiv1.p.rapidapi.com/words/${word}`,
	},
	dicolink: {
		host: "dicolink.p.rapidapi.com",
		definitions: (word: string) => `https://dicolink.p.rapidapi.com/mot/${word}/definitions`,
	},
} as const);
