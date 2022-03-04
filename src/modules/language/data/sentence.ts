/** Represents a pair of a sentence and its translation. */
interface SentencePair {
	/** The source sentence. */
	sentence: string;
	/** The translation of the sentence. */
	translation: string;
}

/**
 * Represents a selection of a sentence to be used for the language game of
 * picking the correct word to fit into the blank space.
 */
interface SentenceSelection {
	/** The selected sentence pair. */
	pair: SentencePair;
	/** The word which fits into the blank in the word. */
	word: string;
	/** Words to choose from to fit into the blank. */
	choices: string[];
}

export type { SentencePair, SentenceSelection };
