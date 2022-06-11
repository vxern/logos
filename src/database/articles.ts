import { faunadb } from "../../deps.ts";
import { capitalise } from "../formatting.ts";
import { Base } from "./base.ts";
import { Article } from "./structs/article.ts";

const $ = faunadb.query;

class Articles extends Base {
	/**
	 * Cached articles.
	 *
	 * The keys are language names, and the values are their respective articles.
	 */
	protected readonly articles: Map<string, Article[]> = new Map();

	/**
	 * Fetches the list of article documents from the database.
	 *
	 * @param language - The language of the articles to fetch.
	 * @returns The array of articles.
	 */
  private async fetchArticles(language: string): Promise<Article[]> {
    console.log(`Fetching articles for ${capitalise(language)}...`)

		const result = await this.dispatchQuery(
			$.Map(
				$.Paginate($.Match($.FaunaIndex('GetArticlesByLanguage'), language)),
				$.Lambda('article', $.Get($.Var('article'))),
			),
		);

		// TODO: Use a more precise data type than 'any'.

		const articles = !result
			? []
			: (result.data as any[]).map((result: any) => result.data as Article);

    this.articles.set(language, articles);

    console.log(`Fetched ${articles.length} articles.`);
    
    return articles;
  }

	/**
	 * Creates an article document in the database.
	 *
	 * @param article - The article to create.
	 * @returns The created article.
	 */
	async createArticle(article: Article): Promise<Article> {
		const result = await this.dispatchQuery(
			$.Call('CreateArticle', article),
		);

		if (!this.articles.has(article.language)) {
			this.articles.set(article.language, []);
		}

		this.articles.get(article.language)!.push(article);

		return result as Article;
	}

	/**
	 * Attempts to get a list of articles from cache, and if the articles do not
	 * exist, attempts to fetch them from the database.
	 *
	 * @param language - The language of the articles to fetch.
	 * @returns An array of articles for the language.
	 */
	async getArticles(language: string): Promise<Article[]> {
		return this.articles.get(language) ?? await this.fetchArticles(language);
	}
}

export { Articles }