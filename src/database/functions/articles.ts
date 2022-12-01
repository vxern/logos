import * as Fauna from 'fauna';
import { ArticleChange } from 'logos/src/database/structs/articles/article-change.ts';
import { Article, getMostRecentArticleContent } from 'logos/src/database/structs/articles/article.ts';
import { Document, Reference } from 'logos/src/database/structs/document.ts';
import { dispatchQuery } from 'logos/src/database/database.ts';
import { Client } from 'logos/src/client.ts';
import { capitalise } from 'logos/formatting.ts';
import { Language } from 'logos/types.ts';

const $ = Fauna.query;

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
	/** The reference to the article database change was made to. */
	articleReference: Reference;

	/** The author of the article change. */
	author: Reference;
}

/**
 * Fetches an array of article documents from the database written for the given
 * language.
 *
 * @param parameter - The parameter for indexing the database.
 * @param value - The value corresponding to the parameter.
 * @returns The array of articles.
 */
async function fetchArticles<
	K extends keyof ArticleIndexParameters,
	V extends ArticleIndexParameters[K],
>(
	client: Client,
	parameter: K,
	value: V,
): Promise<Document<Article>[] | undefined> {
	const parameterCapitalised = capitalise(parameter);
	const index = `GetArticlesBy${parameterCapitalised}`;

	const documents = await dispatchQuery<Article[]>(
		client,
		$.Map(
			$.Paginate($.Match($.FaunaIndex(index), value)),
			$.Lambda('article', $.Get($.Var('article'))),
		),
	);

	if (documents === undefined) {
		client.log.error(`Failed to fetch articles whose ${parameter} matches the query '${value}'.`);
		return undefined;
	}

	const argument = <string> (typeof value === 'object' ? (<Reference> value).value.id : value);

	const cache = parameter === 'language' ? client.database.articlesByLanguage : client.database.articlesByAuthor;

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

	client.database.articlesFetched = true;

	client.log.debug(`Fetched ${documents.length} article(s) whose ${parameter} matches the query '${value}'.`);

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
async function getArticles<
	K extends keyof ArticleIndexParameters,
	V extends ArticleIndexParameters[K],
>(
	client: Client,
	parameter: K,
	value: V,
): Promise<Document<Article>[] | undefined> {
	if (parameter === 'language' && !client.database.articlesFetched) {
		return await fetchArticles(client, parameter, value);
	}

	const argument = <string> (typeof value === 'object' ? (<Reference> value).value.id : value);

	const cache = parameter === 'language' ? client.database.articlesByLanguage : client.database.articlesByAuthor;

	return (!cache.has(argument) ? undefined : Array.from(cache.get(argument)!.values())) ??
		await fetchArticles(client, parameter, value);
}

/**
 * Creates an article document in the database.
 *
 * @param article - The article to create.
 * @returns The created article document.
 */
async function createArticle(
	client: Client,
	article: Article,
): Promise<Document<Article> | undefined> {
	const document = await dispatchQuery<Article>(
		client,
		$.Create($.Collection('Articles'), { data: article }),
	);

	if (document === undefined) {
		client.log.error(`Failed to create article '${article.content.title}'.`);
		return undefined;
	}

	if (!client.database.articlesByLanguage.has(article.language)) {
		await fetchArticles(client, 'language', article.language);
	}
	client.database.articlesByLanguage.get(article.language)!.set(
		document.ref.value.id,
		document,
	);

	if (!client.database.articlesByAuthor.has(article.author.value.id)) {
		await fetchArticles(client, 'author', article.author);
	}
	client.database.articlesByAuthor.get(article.author.value.id)!.set(
		document.ref.value.id,
		document,
	);

	client.log.debug(`Created article '${article.content.title}'.`);

	return document;
}

/**
 * Makes a change to an existing article.
 *
 * @param change - The change to be made.
 * @returns The change made to the article or undefined.
 */
async function changeArticle(
	client: Client,
	change: ArticleChange,
): Promise<Document<ArticleChange> | undefined> {
	const document = await dispatchQuery<ArticleChange>(
		client,
		$.Create($.Collection('ArticleChanges'), { data: change }),
	);

	if (document === undefined) {
		client.log.error('Failed to create article change.');
		return undefined;
	}

	if (
		!client.database.articleChangesByArticleReference.has(document.data.article.value.id)
	) {
		await fetchArticleChanges(
			client,
			'articleReference',
			document.data.article,
		);
	}

	client.database.articleChangesByArticleReference.get(document.data.article.value.id)!
		.push(
			document,
		);
	if (!client.database.articleChangesByAuthor.has(document.data.author.value.id)) {
		await fetchArticleChanges(
			client,
			'author',
			document.data.author,
		);
	}
	client.database.articleChangesByAuthor.get(document.data.author.value.id)!.push(
		document,
	);

	client.log.debug(`Created article change to article '${change.content.title}'.`);

	return document;
}

/**
 * Fetches article changes from the database.
 *
 * @param parameter - The parameter for indexing the database.
 * @param value - The value corresponding to the parameter.
 * @returns An array of article change documents or undefined.
 */
async function fetchArticleChanges<
	K extends keyof ArticleChangeIndexParameters,
	V extends ArticleChangeIndexParameters[K],
>(
	client: Client,
	parameter: K,
	value: V,
): Promise<Document<ArticleChange>[] | undefined> {
	const parameterCapitalised = capitalise(parameter);
	const index = `GetArticleChangesBy${parameterCapitalised}`;

	const documents = await dispatchQuery<ArticleChange[]>(
		client,
		$.Map(
			$.Paginate($.Match($.FaunaIndex(index), value)),
			$.Lambda('articleChange', $.Get($.Var('articleChange'))),
		),
	);

	const parameterPrinted = parameter === 'articleReference' ? 'article reference' : parameter;

	if (documents === undefined) {
		client.log.error(
			`Failed to fetch article changes whose ${parameterPrinted} matches the query '${value}'.`,
		);
		return undefined;
	}

	const cache = parameter === 'articleReference'
		? client.database.articleChangesByArticleReference
		: client.database.articleChangesByAuthor;

	cache.set(
		typeof value === 'object' ? (<Reference> value).value.id : value,
		documents,
	);

	client.log.debug(
		`Fetched ${documents.length} article change(s) whose ${parameterPrinted} matches the query '${value}'.`,
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
async function getArticleChanges<
	K extends keyof ArticleChangeIndexParameters,
	V extends ArticleChangeIndexParameters[K],
>(
	client: Client,
	parameter: K,
	value: V,
): Promise<Document<ArticleChange>[] | undefined> {
	const argument = <string> (typeof value === 'object' ? (<Reference> value).value.id : value);

	const cache = parameter === 'articleReference'
		? client.database.articleChangesByArticleReference
		: client.database.articleChangesByAuthor;

	return cache.get(argument) ?? await fetchArticleChanges(client, parameter, value);
}

/** Taking an array of articles, gets their most up-to-date state. */
async function processArticles(
	client: Client,
	documents: Document<Article>[],
): Promise<Document<Article>[] | undefined> {
	const documentsChanges = await Promise.all(
		documents.map((document) =>
			new Promise<[Document<Article>, Document<ArticleChange>[] | undefined]>(
				(resolve) =>
					getArticleChanges(client, 'articleReference', document.ref)
						.then((changes) => resolve([document, changes])),
			)
		),
	);

	if (documentsChanges.map(([_document, change]) => change).includes(undefined)) {
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

export { changeArticle, createArticle, getArticleChanges, getArticles, processArticles };
