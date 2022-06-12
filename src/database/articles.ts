import { faunadb } from '../../deps.ts';
import { capitalise } from '../formatting.ts';
import { Base } from './base.ts';
import { ArticleChange } from './structs/articles/article-change.ts';
import { Article } from './structs/articles/article.ts';
import { Document } from './structs/document.ts';

const $ = faunadb.query;

class Articles extends Base {
	/**
	 * Cached articles.
	 *
	 * The keys are language names, and the values are their respective articles.
	 */
	protected readonly articles: Map<string, Document<Article>[]> = new Map();

	/**
	 * Fetches an array of article documents from the database written for the given
	 * language.
	 *
	 * @param language - The language of the articles to fetch.
	 * @returns The array of articles.
	 */
	private async fetchArticles(language: string): Promise<Document<Article>[]> {
		console.log(`Fetching articles for ${capitalise(language)}...`);

		const articles = await this.dispatchQuery<Article[]>(
			$.Map(
				$.Paginate($.Match($.FaunaIndex('GetArticlesByLanguage'), language)),
				$.Lambda('article', $.Get($.Var('article'))),
			),
		);

		if (!articles) {
			console.error('Failed to fetch articles.');
			return [];
		}

		this.articles.set(language, articles);

		console.log(`Fetched ${articles.length} articles.`);

		return articles;
	}

	/**
	 * Creates an article document in the database.
	 *
	 * @param article - The article to create.
	 * @returns The created article document.
	 */
	async createArticle(article: Article): Promise<Document<Article>> {
		const document = await this.dispatchQuery<Article>(
			$.Call('CreateArticle', article),
		);

		if (!this.articles.has(article.language)) {
			this.articles.set(article.language, []);
		}

		this.articles.get(article.language)!.push(document!);

		return document!;
	}

	/**
	 * Attempts to get a list of articles from cache, and if the articles do not
	 * exist, attempts to fetch them from the database.
	 *
	 * @param language - The language of the articles to fetch.
	 * @returns An array of articles for the language.
	 */
	async getArticles(language: string): Promise<Document<Article>[]> {
		return this.articles.get(language) ?? await this.fetchArticles(language);
	}

	/**
	 * Updates an existing article.
	 *
	 * @param document - The article document to update.
	 * @param change - The change to be made to the article.
	 * @returns
	 */
	async updateArticle(
		document: Document<Article>,
		change: ArticleChange,
	): Promise<Article> {
		const article = await this.dispatchQuery<Article>(
			$.Call($.FaunaFunction('UpdateArticle'), {
				reference: document.ref,
				change: change,
			}),
		);

		return article!.data;
	}
}

export { Articles };
