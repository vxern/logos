import { Language } from 'logos/types.ts';
import { Document, Reference } from 'logos/src/database/structs/mod.ts';
import { ArticleChange } from 'logos/src/database/structs/articles/mod.ts';

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
interface Article {
	/** The document reference to the author of this article. */
	author: Reference;

	/** The language this article was written for. */
	language: Language;

	/** (Optional) The dialect this article was written for. */
	dialect?: string;

	/** The text content of this article. */
	content: ArticleTextContent;
}

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

/**
 * Taking an article and an array of changes made to it, gets references to
 * the contributors to the article.
 */
function getContributorReferences({
	article,
	changes,
}: {
	article: Article;
	changes: Document<ArticleChange>[];
}): Reference[] {
	const contributorsReferences: Reference[] = [article.author];
	const contributorsIDs: string[] = [article.author.value.id];

	for (const change of changes) {
		if (!contributorsIDs.includes(change.data.author.value.id)) {
			contributorsReferences.push(change.data.author);
			contributorsIDs.push(change.data.author.value.id);
		}
	}

	return contributorsReferences;
}

export { getContributorReferences, getMostRecentArticleContent };
export type { Article, ArticleTextContent };
