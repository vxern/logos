/** Represents a pair of a sentence and its translation. */
interface SentencePair {
	/** The source sentence. */
	sentence: string;

	/** The translation of the sentence. */
	translation: string;
}

export type { SentencePair };
