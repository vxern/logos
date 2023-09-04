export default {
	deepl: {
		translate: "https://api-free.deepl.com/v2/translate",
	},
	googleTranslate: {
		host: "google-translate1.p.rapidapi.com",
		translate: "https://google-translate1.p.rapidapi.com/language/translate/v2",
	},
	words: {
		host: "wordsapiv1.p.rapidapi.com",
		word: (word: string) => `https://wordsapiv1.p.rapidapi.com/words/${word}`,
	},
	dicolink: {
		host: "dicolink.p.rapidapi.com",
		definitions: (word: string) => `https://dicolink.p.rapidapi.com/mot/${word}/definitions`,
	},
};
