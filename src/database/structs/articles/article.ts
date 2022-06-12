import { Document } from '../document.ts';
import { ArticleChange } from './article-change.ts';

/** Represents the text content of an article. */
interface ArticleTextContent {
	/** Title of this article. */
	title: string;

	/** Body of this article. */
	body: string;

	/** Footer of this article. */
	footer?: string;
}

/** Represents an article explaining a concept or a difference between terms. */
type Article = ArticleTextContent & {
	/** ID of this article's author. */
	author: string;

	/** Language this article is written for. */
	language: string;

	/** List of changes made to this article. */
	changes?: Document<ArticleChange>[];
};

function getLastContent(article: Article): ArticleTextContent {
	const lastChange = (article.changes && article.changes.length !== 0)
		? article.changes[article.changes.length - 1]!.data.content
		: undefined;

	if (!lastChange) {
		return {
			title: article.title,
			body: article.body,
			footer: article.footer,
		};
	}

	return lastChange;
}

export { getLastContent };
export type { Article, ArticleTextContent };
