export default Object.freeze({
	tatoebaSentence: (sentenceId: string) => `https://tatoeba.org/en/sentences/show/${encodeURIComponent(sentenceId)}`,
	dexonlineDefinition: (lemma: string) => `https://dexonline.ro/definitie/${encodeURIComponent(lemma)}`,
	dicolinkDefinition: (lemma: string) => `https://dicolink.com/mots/${encodeURIComponent(lemma)}`,
	wiktionaryDefinition: (lemma: string, language: string) =>
		`https://en.wiktionary.org/wiki/${encodeURIComponent(lemma)}#${encodeURIComponent(language)}`,
	wordnikDefinitionLink: (lemma: string) => `https://wordnik.com/words/${lemma}`,
	ponsDefinitionLink: (lemma: string, languages: { source: string; target: string }) =>
		`https://en.pons.com/translate/${languages.source}-${languages.target}/${lemma}`,
	wordsAPIDefinition: () => "https://wordsapi.com",
} as const satisfies Record<string, (...args: any[]) => string>);
