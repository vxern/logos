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
	changes?: ArticleChange[];
};

export type { Article, ArticleTextContent };
