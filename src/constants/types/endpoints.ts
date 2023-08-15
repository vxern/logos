export default {
	deepl: {
		languages: "https://api-free.deepl.com/v2/languages",
		translate: "https://api-free.deepl.com/v2/translate",
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
