import { Article } from './article.ts';

/** Represents an update to an article. */
interface ArticleUpdate {
	/** The previous state of this article. */
	before: Article;

	/** The ID of the author of this change. */
	author: string;

	/** Timestamp of when this article was posted. */
	timestamp?: number;
}

export type { ArticleUpdate };
