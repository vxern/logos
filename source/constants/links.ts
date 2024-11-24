export default Object.freeze({
	tatoebaSentence: (sentenceId: string) => `https://tatoeba.org/en/sentences/show/${encodeURIComponent(sentenceId)}`,
	dexonlineDefinition: (lemma: string) => `https://dexonline.ro/definitie/${encodeURIComponent(lemma)}`,
	wiktionaryDefinition: (lemma: string, language: string) =>
		`https://en.wiktionary.org/wiki/${encodeURIComponent(lemma)}#${encodeURIComponent(language)}`,
	wordnikDefinitionLink: (lemma: string) => `https://wordnik.com/words/${encodeURIComponent(lemma)}`,
	wordsAPIDefinition: () => "https://wordsapi.com",
	dicolinkDefinition: (lemma: string) => `https://dicolink.com/mots/${encodeURIComponent(lemma)}`,
	youtubeVideo: (id: string) => `https://www.youtube.com/watch?v=${id}`,
	youtubePlaylist: (id: string) => `https://www.youtube.com/watch?list=${id}`,
} as const satisfies Record<string, (...args: string[]) => string>);
