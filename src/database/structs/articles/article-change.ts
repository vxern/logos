import { ArticleTextContent } from './article.ts';

/** Represents a change made to an article. */
type ArticleChange = {
	/** The new text content of this article. */
	content: ArticleTextContent;

	/** The ID of the author of this change. */
	author: string;
};

export type { ArticleChange };
