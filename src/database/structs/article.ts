/** Represents a change to an article. */
interface ArticleUpdate {
	/** The previous state of an article. */
	before: Article;
	/** Timestamp of when this change was made. */
	createdAt: number;
}

/** Represents a linguistic article explaining one or more concepts in a language. */
interface Article {
	/** Title of this article. */
	title: string;
	/** ID of this article's author. */
	author: string;
	/** Language this article is written for. */
	language: string;
	/** List of IDs of the users that have contributed to this article. */
	contributors: string[];
	/** Body of this article. */
	body: string;
	/** Footer of this article. */
	footer: string;
	/** List of changes made to this article. */
	changes?: ArticleUpdate[];
	/** Timestamp of when this article was posted. */
	createdAt?: number;
}

export type { Article };
