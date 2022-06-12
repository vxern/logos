import { faunadb } from '../../deps.ts';
import secrets from '../../secrets.ts';
import { Unpacked } from '../utils.ts';
import { Article } from './structs/articles/article.ts';
import { ArticleChange } from './structs/articles/article-change.ts';
import { User } from './structs/users/user.ts';
import { Document } from './structs/document.ts';
import { capitalise } from '../formatting.ts';

const $ = faunadb.query;

/**
 * Provides a layer of abstraction over the database solution used to store data,
 * and the Discord application.
 */
class Database {
	/** Client used to interface with the Fauna database. */
	private readonly client: faunadb.Client;

	/**
	 * Cached users.
	 *
	 * The keys are user IDs, and the values are the bearer of the ID.
	 */
	protected readonly users: Map<string, Document<User>> = new Map();

	/**
	 * Cached articles.
	 *
	 * The keys are language names, and the values are their respective articles.
	 */
	protected readonly articles: Map<string, Document<Article>[]> = new Map();

	private articlesFetched = false;

	/** Constructs a database. */
	constructor() {
		this.client = new faunadb.Client({
			secret: secrets.core.database.secret,
			domain: 'db.us.fauna.com',
			scheme: 'https',
			port: 443,
		});
	}

	/**
	 * Sends a query to Fauna and returns the result, handling any errors that may
	 * have occurred during dispatch.
	 *
	 * @param expression - Fauna expression (query).
	 * @returns The response object.
	 */
	async dispatchQuery<
		T extends unknown | unknown[],
		B = Unpacked<T>,
		R = T extends Array<B> ? Document<B>[] : Document<T>,
	>(
		expression: faunadb.Expr,
	): Promise<R | undefined> {
		try {
			const queryResult = (await this.client.query(expression)) as Record<
				string,
				unknown
			>;

			if (!Array.isArray(queryResult.data)) {
				queryResult.ts = (queryResult.ts as number) / 1000;

				return queryResult! as R;
			}

			for (const element of queryResult.data) {
				element.ts = (element.ts as number) / 1000;
			}

			return queryResult!.data! as unknown as R;
		} catch (error) {
			if (error.description === 'Set not found.') return undefined;

			console.error(`${error.message} ~ ${error.description}`);
		}

		return undefined;
	}

	/**
	 * Fetches a user document from the database.
	 *
	 * @param id - The user's Discord ID.
	 * @returns The user document or undefined.
	 */
	private async fetchUser(id: string): Promise<Document<User> | undefined> {
		const response = await this.dispatchQuery<User>(
			$.Get($.Match($.FaunaIndex('GetUserByID'), id)),
		);

		if (!response) return undefined;

		const user = response;

		this.users.set(id, user);

		return user;
	}

	/**
	 * Creates a user document in the database.
	 *
	 * @param user - The user object.
	 * @returns The created user document.
	 */
	private async createUser(user: User): Promise<Document<User>> {
		const document = await this.dispatchQuery<User>(
			$.Call('CreateUser', user),
		);

		this.users.set(user.account.id, document!);

		return document!;
	}

	/**
	 * Attempts to get a user object from cache, and if the user object does not
	 * exist, attempts to fetch it from the database. If the user object does not exist
	 * in the database, this method will create one.
	 *
	 * @param id - The ID of the user to get.
	 * @returns The user.
	 */
	async getUser(id: string): Promise<Document<User>> {
		return this.preprocessUser(
			this.users.get(id) ?? await this.fetchUser(id) ??
				await this.createUser({ account: { id: id } }),
		);
	}

	/**
	 * Taking a user document, carries out checks on the data before returning the
	 * fixed user object.
	 *
	 * @param document - The user document to process.
	 * @returns The processed user document.
	 */
	private preprocessUser(document: Document<User>): Document<User> {
		// TODO: Implement user preprocessing.

		return document;
	}

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

		if (this.articles.has(language)) {
			const cachedArticles = this.articles.get(language)!;
			const cachedArticleTitles = cachedArticles.map((article) =>
				article.data.title
			);

			const pushableArticles = articles.reduce<Document<Article>[]>(
				(pushable, article) => {
					if (cachedArticleTitles.includes(article.data.title)) {
						pushable.push(article);
					}

					return pushable;
				},
				[],
			);

			this.articles.get(language)!.push(...pushableArticles);
		} else {
			this.articles.set(language, articles);
		}

		this.articlesFetched = true;

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
		if (!this.articlesFetched) {
			return await this.fetchArticles(language);
		}

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
	): Promise<Document<Article>> {
		const article = await this.dispatchQuery<Article>(
			$.Call($.FaunaFunction('UpdateArticle'), {
				reference: document.ref,
				change: change,
			}),
		);

		return article!;
	}
}

export { Database };
