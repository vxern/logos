import { Document, Reference } from '../document.ts';
import { ArticleChange } from './article-change.ts';

/** Represents the text content of an article. */
interface ArticleTextContent {
	/** The title of this article. */
	title: string;

	/** The body of this article. */
	body: string;

	/** The footer of this article. */
	footer?: string;
}

/** Represents an article explaining a concept or a difference between terms. */
type Article = {
	/** The document reference to the author of this article. */
	author: Reference;

	/** The language this article was written for. */
	language: string;

	/** The text content of this article. */
	content: ArticleTextContent;
};

/**
 * Taking an article and an array of changes made to it, gets the most
 * up-to-date content.
 */
function getMostRecentArticleContent({
	article,
	changes,
}: {
	article: Article;
	changes: Document<ArticleChange>[];
}): ArticleTextContent {
	if (changes.length === 0) {
		return article.content;
	}

	const mostRecentChange = changes.reduce((change, current) => {
		if (current.ts > change.ts) {
			return current;
		}

		return change;
	});

	return mostRecentChange.data.content;
}

export { getMostRecentArticleContent };
export type { Article, ArticleTextContent };
