import { ArticleUpdate } from './article-update.ts';

/** Represents an article explaining a concept or a difference between terms. */
interface Article {
	/** Title of this article. */
	title: string;

	/** ID of this article's author. */
	author: string;

	/** Language this article is written for. */
	language: string;

	/** Body of this article. */
	body: string;

	/** Footer of this article. */
	footer?: string;

	/** List of updates to this article. */
	updates?: ArticleUpdate[];

	/** Timestamp of when this article was submitted. */
	timestamp?: number;
}

export type { Article };
