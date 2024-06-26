const keys = Object.freeze({
	redis: {
		sentencePairIndex: ({ locale }: { locale: string }) => `${locale}:SI`,
		sentencePair: ({ locale, sentenceId }: { locale: string; sentenceId: string | number }) =>
			`${locale}:S:${sentenceId}`,
		lemmaUseIndex: ({ locale, lemma }: { locale: string; lemma: string }) => `${locale}:LI:${lemma}`,
		lemmaFormIndex: ({ locale, lemma }: { locale: string; lemma: string }) => `${locale}:LF:${lemma.toLowerCase()}`,
	},
});

export default keys;
