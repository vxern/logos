import { Reference } from '../mod.ts';
import { ArticleTextContent } from './mod.ts';

/** Represents a change made to an article. */
interface ArticleChange {
	/** The document reference to the author of this change. */
	author: Reference;

	/** The document reference to the article this change was made to. */
	article: Reference;

	/** The new text content of this article. */
	content: ArticleTextContent;
}

export type { ArticleChange };
