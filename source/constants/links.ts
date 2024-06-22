export default Object.freeze({
	tatoebaSentence: (sentenceId: string) => `https://tatoeba.org/en/sentences/show/${encodeURIComponent(sentenceId)}`,
	dexonlineDefinition: (lemma: string) => `https://dexonline.ro/definitie/${encodeURIComponent(lemma)}`,
	wiktionaryDefinition: (lemma: string, language: string) =>
		`https://en.wiktionary.org/wiki/${encodeURIComponent(lemma)}#${encodeURIComponent(language)}`,
	generateWordnikDefinitionLink: (lemma: string) => `https://wordnik.com/words/${lemma}`,
	wordsAPIDefinition: () => "https://wordsapi.com",
	dicolinkDefinition: (lemma: string) => `https://dicolink.com/mots/${encodeURIComponent(lemma)}`,
} as const satisfies Record<string, (...args: string[]) => string>);
