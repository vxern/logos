import { faunadb } from '../../deps.ts';
import secrets from '../../secrets.ts';
import {
	Article,
	getMostRecentArticleContent,
} from './structs/articles/article.ts';
import { ArticleChange } from './structs/articles/article-change.ts';
import { User } from './structs/users/user.ts';
import { Document, Reference } from './structs/document.ts';
import { capitalise } from '../formatting.ts';
import { Praise } from './structs/users/praise.ts';
import { Warning } from './structs/users/warning.ts';
import { Language } from '../types.ts';

/**
 * 'Unpacks' a nested type from an array, function or promise.
 *
 * @typeParam T - The type from which to extract the nested type.
 */
type Unpacked<T> = T extends (infer U)[] ? U
	: T extends (...args: unknown[]) => infer U ? U
	: T extends Promise<infer U> ? U
	: T;

const $ = faunadb.query;

/** Defines parameters used in indexing articles. */
interface ArticleIndexParameters {
	/** The language of the article. */
	language: Language;

	/** The dialect of the article. */
	dialect: string;

	/** The author of the article. */
	author: Reference;
}

/** Defines parameters used in indexing article changes. */
interface ArticleChangeIndexParameters {
	/** The reference to the article this change was made to. */
	articleReference: Reference;

	/** The author of the article change. */
	author: Reference;
}

/** Defines parameters used in indexing users. */
interface UserIndexParameters {
	/** The reference to the user. */
	reference: Reference;

	/** The ID of the user. */
	id: string;
}

/** Defines parameters used in indexing praises. */
interface PraiseIndexParameters {
	/** The reference to the author of this praise. */
	author: Reference;

	/** The reference to the recipient of this praise. */
	subject: Reference;
}

/**
 * Provides a layer of abstraction over the database solution used to store data
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
		Language,
		Map<string, Document<Article>>
	> = new Map();

	private articlesFetched = false;

	/**
	 * Cached articles.
	 *
	 * The keys are user references, and the values are maps with article references as keys
	 * and article documents as values.
	 */
	private readonly articlesByAuthor: Map<
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
	private readonly articleChangesByAuthor: Map<
		string,
		Document<ArticleChange>[]
	> = new Map();

	/**
	 * Cached user warnings.
	 *
	 * The keys are user IDs, and the values are the user's respective warnings.
	 */
	private readonly warningsBySubject: Map<string, Document<Warning>[]> =
		new Map();

	/**
	 * Cached user praises.
	 *
	 * The keys are user IDs, and the values are the praises given by that same user.
	 */
	private readonly praisesByAuthor: Map<string, Document<Praise>[]> = new Map();

	/**
	 * Cached user praises.
	 *
	 * The keys are user IDs, and the values are the praises given to that same user.
	 */
	private readonly praisesBySubject: Map<string, Document<Praise>[]> =
		new Map();

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
			const queryResult = <Record<
				string,
				unknown
			>> (await this.client.query(expression));

			if (!Array.isArray(queryResult.data)) {
				queryResult.ts = <number> queryResult.ts / 1000;

				return <R> queryResult;
			}

			for (const element of queryResult.data) {
				element.ts = <number> element.ts / 1000;
			}

			return <R> (<unknown> queryResult.data);
		} catch (error) {
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
			$.Create($.Collection('Users'), { data: user }),
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
			? this.users.get((<Reference> value).value.id)
			: Array.from(this.users.values()).find((document) =>
				document.data.account.id === value
			);

		const cacheOrFetch = cacheValue ?? await this.fetchUser(parameter, value);
		if (cacheOrFetch) return cacheOrFetch;

		if (parameter === 'id') {
			return await this.createUser({ account: { id: <string> value } });
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
		const index = `GetArticlesBy${parameterCapitalised}`;

		const documents = await this.dispatchQuery<Article[]>(
			$.Map(
				$.Paginate($.Match($.FaunaIndex(index), value)),
				$.Lambda('article', $.Get($.Var('article'))),
			),
		);

		if (!documents) {
			console.error(`Failed to fetch articles for ${parameter} ${value}.`);
			return undefined;
		}

		const argument =
			<string> (typeof value === 'object'
				? (<Reference> value).value.id
				: value);

		const cache = parameter === 'language'
			? this.articlesByLanguage
			: this.articlesByAuthor;

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
			<string> (typeof value === 'object'
				? (<Reference> value).value.id
				: value);

		const cache = parameter === 'language'
			? this.articlesByLanguage
			: this.articlesByAuthor;

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
			$.Create($.Collection('Articles'), { data: article }),
		);

		if (!document) {
			console.error(`Failed to create article ${article.content.title}.`);
			return undefined;
		}

		if (!this.articlesByLanguage.has(article.language)) {
			await this.fetchArticles('language', article.language);
		}

		this.articlesByLanguage.get(article.language)!.set(
			document.ref.value.id,
			document,
		);

		if (!this.articlesByAuthor.has(article.author.value.id)) {
			await this.fetchArticles('author', article.author);
		}

		this.articlesByAuthor.get(article.author.value.id)!.set(
			document.ref.value.id,
			document,
		);

		console.log(`Created article ${article.content.title}.`);

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
			$.Create($.Collection('ArticleChanges'), { data: change }),
		);

		if (!document) {
			console.error(`Failed to create article change.`);
			return undefined;
		}

		if (
			!this.articleChangesByArticleReference.has(document.data.article.value.id)
		) {
			await this.fetchArticleChanges('articleReference', document.data.article);
		}

		this.articleChangesByArticleReference.get(document.data.article.value.id)!
			.push(
				document,
			);

		if (!this.articleChangesByAuthor.has(document.data.author.value.id)) {
			await this.fetchArticleChanges('author', document.data.author);
		}

		this.articleChangesByAuthor.get(document.data.author.value.id)!.push(
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
		const index = `GetArticleChangesBy${parameterCapitalised}`;

		const documents = await this.dispatchQuery<ArticleChange[]>(
			$.Map(
				$.Paginate($.Match($.FaunaIndex(index), value)),
				$.Lambda('articleChange', $.Get($.Var('articleChange'))),
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
			: this.articleChangesByAuthor;

		cache.set(
			typeof value === 'object' ? (<Reference> value).value.id : value,
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
			<string> (typeof value === 'object'
				? (<Reference> value).value.id
				: value);

		const cache = parameter === 'articleReference'
			? this.articleChangesByArticleReference
			: this.articleChangesByAuthor;

		return cache.get(argument) ??
			await this.fetchArticleChanges(parameter, value);
	}

	/** Taking an array of articles, gets their most up-to-date state. */
	async processArticles(
		documents: Document<Article>[],
	): Promise<Document<Article>[] | undefined> {
		const documentsChanges = await Promise.all(
			documents.map((document) =>
				new Promise<[Document<Article>, Document<ArticleChange>[] | undefined]>(
					(
						resolve,
					) =>
						this.getArticleChanges(
							'articleReference',
							document.ref,
						)
							.then((changes) => {
								resolve([document, changes]);
							}),
				)
			),
		);

		if (
			documentsChanges.map(([_document, change]) => change).includes(undefined)
		) {
			return;
		}

		return documentsChanges.map(([document, changes]) => {
			document.data.content = getMostRecentArticleContent({
				article: document.data,
				changes: changes!,
			});

			return document;
		});
	}

	/**
	 * Fetches warnings from the database.
	 *
	 * @param user - The user to use for indexing the database.
	 * @returns An array of article change documents or undefined.
	 */
	private async fetchWarnings(
		user: Reference,
	): Promise<Document<Warning>[] | undefined> {
		const documents = await this.dispatchQuery<Warning[]>(
			$.Map(
				$.Paginate($.Match($.FaunaIndex('GetWarningsBySubject'), user)),
				$.Lambda('warning', $.Get($.Var('warning'))),
			),
		);

		if (!documents) {
			console.error(`Failed to fetch warnings by user.`);
			return undefined;
		}

		this.warningsBySubject.set(user.value.id, documents);

		return documents;
	}

	/**
	 * Attempts to get user warnings from cache, and if the warnings do not exist,
	 * attempts to fetch them from the database.
	 *
	 * @param user - The reference to the user for indexing the database.
	 * @returns The warnings.
	 */
	async getWarnings(
		user: Reference,
	): Promise<Document<Warning>[] | undefined> {
		return this.warningsBySubject.get(user.value.id) ??
			await this.fetchWarnings(user);
	}

	/**
	 * Creates a warning document in the database.
	 *
	 * @param warning - The warning to create.
	 * @returns The created warning document.
	 */
	async createWarning(
		warning: Warning,
	): Promise<Document<Warning> | undefined> {
		const document = await this.dispatchQuery<Warning>(
			$.Create($.Collection('Warnings'), { data: warning }),
		);

		if (!document) {
			console.error(`Failed to create warning for user ${warning.subject}.`);
			return undefined;
		}

		if (!this.warningsBySubject.has(warning.subject.value.id)) {
			await this.fetchWarnings(warning.subject);
		}

		this.warningsBySubject.get(warning.subject.value.id)!.push(document);

		console.log(`Created warning ${document.ref}.`);

		return document;
	}

	/**
	 * Deletes a warning document in the database.
	 *
	 * @param warning - The warning to delete.
	 * @returns The deleted warning document.
	 */
	async deleteWarning(
		warning: Document<Warning>,
	): Promise<Document<Warning> | undefined> {
		const document = await this.dispatchQuery<Warning>($.Delete(warning.ref));

		if (!document) {
			console.error(
				`Failed to delete warning given to user ${warning.data.subject}.`,
			);
			return undefined;
		}

		const indexOfWarningToRemove = this.warningsBySubject.get(
			warning.data.subject.value.id,
		)!.findIndex((warning) => warning.ref.value.id === document.ref.value.id)!;

		this.warningsBySubject.set(
			warning.data.subject.value.id,
			this.warningsBySubject.get(warning.data.subject.value.id)!.splice(
				indexOfWarningToRemove,
				indexOfWarningToRemove,
			),
		);

		console.log(`Deleted warning ${document.ref}.`);

		return document;
	}

	/**
	 * Fetches praises from the database.
	 *
	 * @param parameter - The parameter for indexing the database.
	 * @param value - The value corresponding to the parameter.
	 * @returns An array of praise documents or undefined.
	 */
	private async fetchPraises<
		K extends keyof PraiseIndexParameters,
		V extends PraiseIndexParameters[K],
	>(
		parameter: K,
		value: V,
	): Promise<Document<Praise>[] | undefined> {
		const parameterCapitalised = capitalise(parameter);
		const index = `GetPraisesBy${parameterCapitalised}`;

		const documents = await this.dispatchQuery<Praise[]>(
			$.Map(
				$.Paginate($.Match($.FaunaIndex(index), value)),
				$.Lambda('praise', $.Get($.Var('praise'))),
			),
		);

		if (!documents) {
			console.error(
				`Failed to fetch praises by ${parameterCapitalised}.`,
			);
			return undefined;
		}

		const cache = parameter === 'author'
			? this.praisesByAuthor
			: this.praisesBySubject;

		cache.set(
			value.value.id,
			documents,
		);

		return documents;
	}

	/**
	 * Attempts to get praises from cache, and if the praises do not exist, attempts
	 * to fetch them from the database.
	 *
	 * @param parameter - The parameter for indexing the database.
	 * @param value - The value corresponding to the parameter.
	 * @returns The praises.
	 */
	async getPraises<
		K extends keyof PraiseIndexParameters,
		V extends PraiseIndexParameters[K],
	>(
		parameter: K,
		value: V,
	): Promise<Document<Praise>[] | undefined> {
		const cache = parameter === 'author'
			? this.praisesByAuthor
			: this.praisesBySubject;

		return cache.get(value.value.id) ??
			await this.fetchPraises(parameter, value);
	}

	/**
	 * Creates a praise document in the database.
	 *
	 * @param praise - The praise to create.
	 * @returns The created praise document.
	 */
	async createPraise(
		praise: Praise,
	): Promise<Document<Praise> | undefined> {
		const document = await this.dispatchQuery<Warning>(
			$.Create($.Collection('Praises'), { data: praise }),
		);

		if (!document) {
			console.error(`Failed to create praises for user ${praise.subject}.`);
			return undefined;
		}

		if (!this.praisesByAuthor.has(praise.author.value.id)) {
			await this.fetchPraises('author', praise.author);
		}

		this.praisesByAuthor.get(praise.author.value.id)!.push(document);

		if (!this.praisesBySubject.has(praise.subject.value.id)) {
			await this.fetchPraises('subject', praise.subject);
		}

		this.praisesBySubject.get(praise.subject.value.id)!.push(document);

		console.log(`Created praise ${document.ref}.`);

		return document;
	}
}

export { Database };
