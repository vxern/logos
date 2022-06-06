import { faunadb } from '../../deps.ts';
import secrets from '../../secrets.ts';
import { Article } from './structs/article.ts';
import { User } from './structs/users/user.ts';

const $ = faunadb.query;

/**
 * Provides a layer of abstraction over the database solution used to store data,
 * and the Discord application.
 */
class Database {
	/** Client used to interface with the Fauna database. */
	readonly #client: faunadb.Client;

	/**
	 * Cached articles.
	 *
	 * The keys are language names, and the values are their respective articles.
	 */
	readonly articles: Map<string, Article[]> = new Map();

	/**
	 * Cached users.
	 *
	 * The keys are user IDs, and the values are the bearer of the ID.
	 */
	readonly users: Map<string, User> = new Map();

	/** Constructs a database. */
	constructor() {
		this.#client = new faunadb.Client({
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
	async dispatchQuery(expression: faunadb.Expr): Promise<any> {
		try {
			const queryResult = (await this.#client.query(expression)) as any;

			// TODO: Use a precise data type for the query response.

			console.log(queryResult);

			return queryResult;
		} catch (error) {
			if (error.description === 'Set not found.') return undefined;

			console.error(`${error.message} ~ ${error.description}`);
		}

		return undefined;
	}

	/**
	 * Gets a list of articles from the database by their language.
	 *
	 * @param language - The language of the articles to fetch.
	 * @returns An array of articles for the language.
	 */
	async getArticlesByLanguage(language: string): Promise<Article[]> {
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
	 * Gets a user document from the database.
	 *
	 * @param id - The user's Discord ID.
	 * @returns The user or undefined.
	 */
	async getUser(id: string): Promise<User | undefined> {
		const response = await this.dispatchQuery(
			$.Get($.Match($.FaunaIndex('GetUserByID'), id)),
		);

		if (!response) return undefined;

		const user = response as User;

		this.users.set(id, user);

		return user;
	}

	/**
	 * Creates a user document in the database.
	 *
	 * @param id - The user's Discord ID.
	 * @returns The created user.
	 */
	async createUser(id: string): Promise<User> {
		const userSkeleton: User = { account: { id: id } };

		const response = await this.dispatchQuery(
			$.Call('CreateUser', userSkeleton),
		);

		const user = response as User;

		this.users.set(id, user);

		return user;
	}

	/**
	 * Attempts to get a user object from cache, and if the user object does not
	 * exist, attempts to get it from the database. If the user object does not exist
	 * in the database, the method will create one.
	 *
	 * @param id - The ID of the user to fetch.
	 * @returns The user.
	 */
	async fetchUser(id: string): Promise<User> {
		return this.preprocessUser(
			this.users.get(id) ?? await this.getUser(id) ??
				await this.createUser(id),
		);
	}

	/**
	 * Taking a user, carries out checks on the data before returning the fixed user
	 * object.
	 *
	 * @param user - The user object to process.
	 * @returns The processed user document.
	 */
	preprocessUser(user: User): User {
		// TODO: Implement user preprocessing.

		return user;
	}
}

export { Database };
