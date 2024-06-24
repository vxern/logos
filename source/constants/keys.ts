const keys = Object.freeze({
	redis: {
		sentencePairIndex: ({ locale }: { locale: string }) => `${locale}:index`,
		sentencePair: ({ locale, sentenceId }: { locale: string; sentenceId: string | number }) =>
			`${locale}:${sentenceId}`,
		lemmaIndex: ({ locale, lemma }: { locale: string; lemma: string }) => `${locale}::${lemma}`,
	},
});

export default keys;
