export default {
	deepl: {
		languages: "https://api-free.deepl.com/v2/languages",
		translate: "https://api-free.deepl.com/v2/translate",
	},
	words: {
		word: (word: string) => `https://wordsapiv1.p.rapidapi.com/words/${word}`,
	},
};
