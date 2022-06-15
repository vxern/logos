import { faunadb } from '../../deps.ts';
import secrets from '../../secrets.ts';
import { Unpacked } from '../utils.ts';
import { Article } from './structs/articles/article.ts';
import { ArticleChange } from './structs/articles/article-change.ts';
import { User } from './structs/users/user.ts';
import { Document, Reference } from './structs/document.ts';
import { capitalise } from '../formatting.ts';

const $ = faunadb.query;

type ArticleIndexParameters = {
	language: string;
	author: Reference;
};

type ArticleChangeIndexParameters = {
	articleReference: Reference;
	author: Reference;
};

type UserIndexParameters = {
	reference: Reference;
	id: string;
};

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
	 * The keys are user references, and the values are the corresponding user documents.
	 */
	private readonly users: Map<string, Document<User>> = new Map();

	/**
	 * Cached articles.
	 *
	 * The keys are language names, and the values are maps with article references as keys
	 * and article documents as values.
	 */
	private readonly articlesByLanguage: Map<
		string,
		Map<string, Document<Article>>
	> = new Map();

	private articlesFetched = false;

	/**
	 * Cached articles.
	 *
	 * The keys are user references, and the values are maps with article references as keys
	 * and article documents as values.
	 */
	private readonly articlesByUser: Map<
		string,
		Map<string, Document<Article>>
	> = new Map();

	/**
	 * Cached article changes.
	 *
	 * The keys are article references, and the values are their respective article changes.
	 */
	private readonly articleChangesByArticleReference: Map<
		string,
		Document<ArticleChange>[]
	> = new Map();

	/**
	 * Cached article changes.
	 *
	 * The keys are user IDs, and the values are the user's respective article changes.
	 */
	private readonly articleChangesByUser: Map<
		string,
		Document<ArticleChange>[]
	> = new Map();

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
	 * @param parameter - The parameter for indexing the database.
	 * @param value - The value corresponding to the parameter.
	 * @returns An array of user documents or undefined.
	 */
	private async fetchUser<
		K extends keyof UserIndexParameters,
		V extends UserIndexParameters[K],
	>(
		parameter: K,
		value: V,
	): Promise<Document<User> | undefined> {
		const document = await this.dispatchQuery<User>(
			$.Get(
				parameter === 'reference'
					? value
					: $.Match($.FaunaIndex('GetUserByID'), value),
			),
		);

		if (!document) {
			console.error(
				`Failed to fetch user with ${`${parameter} ${value}`} from the database.`,
			);
			return undefined;
		}

		this.users.set(document.ref.value.id, document);

		return document;
	}

	/**
	 * Creates a user document in the database.
	 *
	 * @param user - The user object.
	 * @returns The created user document.
	 */
	private async createUser(user: User): Promise<Document<User> | undefined> {
		const document = await this.dispatchQuery<User>(
			$.Call('CreateUser', user),
		);

		if (!document) {
			console.error(
				`Failed to create a document for user ${user.account.id} in the database.`,
			);
			return undefined;
		}

		this.users.set(document.ref.value.id, document);

		return document;
	}

	/**
	 * Attempts to get a user object from cache, and if the user object does not
	 * exist, attempts to fetch it from the database. If the user object does not exist
	 * in the database, this method will create one.
	 *
	 * @param parameter - The parameter for indexing the database.
	 * @param value - The value corresponding to the parameter.
	 * @returns The user document or undefined.
	 */
	async getOrCreateUser<
		K extends keyof UserIndexParameters,
		V extends UserIndexParameters[K],
	>(
		parameter: K,
		value: V,
	): Promise<Document<User> | undefined> {
		const cacheValue = parameter === 'reference'
			? this.users.get((value as Reference).value.id)
			: Array.from(this.users.values()).find((document) =>
				document.data.account.id === value
			);

		const cacheOrFetch = cacheValue ?? await this.fetchUser(parameter, value);

		if (cacheOrFetch) return cacheOrFetch;

		if (parameter === 'id') {
			return await this.createUser({ account: { id: value as string } });
		}

		return undefined;
	}

	/**
	 * Fetches an array of article documents from the database written for the given
	 * language.
	 *
	 * @param parameter - The parameter for indexing the database.
	 * @param value - The value corresponding to the parameter.
	 * @returns The array of articles.
	 */
	private async fetchArticles<
		K extends keyof ArticleIndexParameters,
		V extends ArticleIndexParameters[K],
	>(
		parameter: K,
		value: V,
	): Promise<Document<Article>[] | undefined> {
		const parameterCapitalised = capitalise(parameter);
		const faunaFunction = `GetArticlesBy${parameterCapitalised}`;

		const documents = await this.dispatchQuery<Article[]>(
			$.Call($.FaunaFunction(faunaFunction), value),
		);

		if (!documents) {
			console.error(`Failed to fetch articles for ${parameter} ${value}.`);
			return undefined;
		}

		const argument =
			(typeof value === 'object'
				? (value as Reference).value.id
				: value) as string;

		const cache = parameter === 'language'
			? this.articlesByLanguage
			: this.articlesByUser;

		if (!cache.has(argument)) {
			cache.set(argument, new Map());
		}

		const map = cache.get(argument)!;

		for (const document of documents) {
			map.set(
				document.ref.value.id,
				document,
			);
		}

		this.articlesFetched = true;

		console.log(
			`Fetched ${documents.length} articles for ${parameter} ${value}.`,
		);

		return documents;
	}

	/**
	 * Attempts to get a list of articles from cache, and if the articles do not
	 * exist, attempts to fetch them from the database.
	 *
	 * @param parameter - The parameter for indexing the database.
	 * @param value - The value corresponding to the parameter.
	 * @returns An array of articles for the language.
	 */
	async getArticles<
		K extends keyof ArticleIndexParameters,
		V extends ArticleIndexParameters[K],
	>(
		parameter: K,
		value: V,
	): Promise<Document<Article>[] | undefined> {
		if (parameter === 'language' && !this.articlesFetched) {
			return await this.fetchArticles(parameter, value);
		}

		const argument =
			(typeof value === 'object'
				? (value as Reference).value.id
				: value) as string;

		const cache = parameter === 'language'
			? this.articlesByLanguage
			: this.articlesByUser;

		return (!cache.has(argument)
			? undefined
			: Array.from(cache.get(argument)!.values())) ??
			await this.fetchArticles(parameter, value);
	}

	/**
	 * Creates an article document in the database.
	 *
	 * @param article - The article to create.
	 * @returns The created article document.
	 */
	async createArticle(
		article: Article,
	): Promise<Document<Article> | undefined> {
		const document = await this.dispatchQuery<Article>(
			$.Call('CreateArticle', article),
		);

		if (!document) {
			console.error(`Failed to create article ${article.content.title}.`);
			return undefined;
		}

		if (!this.articlesByLanguage.has(article.language)) {
			this.articlesByLanguage.set(article.language, new Map());
		}

		this.articlesByLanguage.get(article.language)!.set(
			document.ref.value.id,
			document,
		);

		if (!this.articlesByUser.has(article.author.value.id)) {
			this.articlesByUser.set(article.author.value.id, new Map());
		}

		this.articlesByUser.get(article.author.value.id)!.set(
			document.ref.value.id,
			document,
		);

		console.error(`Created article ${article.content.title}.`);

		return document;
	}

	/**
	 * Makes a change to an existing article.
	 *
	 * @param change - The change to be made.
	 * @returns The change made to the article or undefined.
	 */
	async changeArticle(
		change: ArticleChange,
	): Promise<Document<ArticleChange> | undefined> {
		const document = await this.dispatchQuery<ArticleChange>(
			$.Call($.FaunaFunction('CreateArticleChange'), change),
		);

		if (!document) {
			console.error(`Failed to create article change.`);
			return undefined;
		}

		if (
			!this.articleChangesByArticleReference.has(document.data.article.value.id)
		) {
			this.articleChangesByArticleReference.set(
				document.data.article.value.id,
				[],
			);
		}

		this.articleChangesByArticleReference.get(document.data.article.value.id)!
			.push(
				document,
			);

		if (!this.articleChangesByUser.has(document.data.author.value.id)) {
			this.articleChangesByUser.set(document.data.author.value.id, []);
		}

		this.articleChangesByUser.get(document.data.author.value.id)!.push(
			document,
		);

		return document;
	}

	/**
	 * Fetches article changes from the database.
	 *
	 * @param parameter - The parameter for indexing the database.
	 * @param value - The value corresponding to the parameter.
	 * @returns An array of article change documents or undefined.
	 */
	private async fetchArticleChanges<
		K extends keyof ArticleChangeIndexParameters,
		V extends ArticleChangeIndexParameters[K],
	>(
		parameter: K,
		value: V,
	): Promise<Document<ArticleChange>[] | undefined> {
		const parameterCapitalised = capitalise(parameter);
		const faunaFunction = `GetArticleChangesBy${parameterCapitalised}`;

		const documents = await this.dispatchQuery<ArticleChange[]>(
			$.Call(
				$.FaunaFunction(faunaFunction),
				value,
			),
		);

		if (!documents) {
			console.error(
				`Failed to fetch article changes by ${parameterCapitalised}.`,
			);
			return undefined;
		}

		const cache = parameter === 'articleReference'
			? this.articleChangesByArticleReference
			: this.articleChangesByUser;

		cache.set(
			typeof value === 'object' ? (value as Reference).value.id : value,
			documents,
		);

		return documents;
	}

	/**
	 * Attempts to get article changes from cache, and if the article changes do not
	 * exist, attempts to fetch them from the database.
	 *
	 * @param parameter - The parameter for indexing the database.
	 * @param value - The value corresponding to the parameter.
	 * @returns The user.
	 */
	async getArticleChanges<
		K extends keyof ArticleChangeIndexParameters,
		V extends ArticleChangeIndexParameters[K],
	>(
		parameter: K,
		value: V,
	): Promise<Document<ArticleChange>[] | undefined> {
		const argument =
			(typeof value === 'object'
				? (value as Reference).value.id
				: value) as string;

		const cache = parameter === 'articleReference'
			? this.articleChangesByArticleReference
			: this.articleChangesByUser;

		return cache.get(argument) ??
			await this.fetchArticleChanges(parameter, value);
	}
}

export { Database };
