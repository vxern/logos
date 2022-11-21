import { Reference } from 'logos/src/database/structs/mod.ts';
import { ArticleTextContent } from 'logos/src/database/structs/articles/mod.ts';

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
