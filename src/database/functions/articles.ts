import { faunadb } from '../../../deps.ts';
import { capitalise } from '../../formatting.ts';
import { Language } from '../../types.ts';
import { Database, dispatchQuery } from '../database.ts';
import { ArticleChange } from '../structs/articles/article-change.ts';
import {
	Article,
	getMostRecentArticleContent,
} from '../structs/articles/article.ts';
import { Document, Reference } from '../structs/document.ts';

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
	database: Database,
	parameter: K,
	value: V,
): Promise<Document<Article>[] | undefined> {
	const parameterCapitalised = capitalise(parameter);
	const index = `GetArticlesBy${parameterCapitalised}`;

	const documents = await dispatchQuery<Article[]>(
		database,
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
		<string> (typeof value === 'object' ? (<Reference> value).value.id : value);

	const cache = parameter === 'language'
		? database.articlesByLanguage
		: database.articlesByAuthor;

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

	database.articlesFetched = true;

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
async function getArticles<
	K extends keyof ArticleIndexParameters,
	V extends ArticleIndexParameters[K],
>(
	database: Database,
	parameter: K,
	value: V,
): Promise<Document<Article>[] | undefined> {
	if (parameter === 'language' && !database.articlesFetched) {
		return await fetchArticles(database, parameter, value);
	}

	const argument =
		<string> (typeof value === 'object' ? (<Reference> value).value.id : value);

	const cache = parameter === 'language'
		? database.articlesByLanguage
		: database.articlesByAuthor;

	return (!cache.has(argument)
		? undefined
		: Array.from(cache.get(argument)!.values())) ??
		await fetchArticles(database, parameter, value);
}

/**
 * Creates an article document in the database.
 *
 * @param article - The article to create.
 * @returns The created article document.
 */
async function createArticle(
	database: Database,
	article: Article,
): Promise<Document<Article> | undefined> {
	const document = await dispatchQuery<Article>(
		database,
		$.Create($.Collection('Articles'), { data: article }),
	);

	if (!document) {
		console.error(`Failed to create article ${article.content.title}.`);
		return undefined;
	}

	if (!database.articlesByLanguage.has(article.language)) {
		await fetchArticles(database, 'language', article.language);
	}

	database.articlesByLanguage.get(article.language)!.set(
		document.ref.value.id,
		document,
	);

	if (!database.articlesByAuthor.has(article.author.value.id)) {
		await fetchArticles(database, 'author', article.author);
	}

	database.articlesByAuthor.get(article.author.value.id)!.set(
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
async function changeArticle(
	database: Database,
	change: ArticleChange,
): Promise<Document<ArticleChange> | undefined> {
	const document = await dispatchQuery<ArticleChange>(
		database,
		$.Create($.Collection('ArticleChanges'), { data: change }),
	);

	if (!document) {
		console.error(`Failed to create article change.`);
		return undefined;
	}

	if (
		!database.articleChangesByArticleReference.has(
			document.data.article.value.id,
		)
	) {
		await fetchArticleChanges(
			database,
			'articleReference',
			document.data.article,
		);
	}

	database.articleChangesByArticleReference.get(document.data.article.value.id)!
		.push(
			document,
		);

	if (!database.articleChangesByAuthor.has(document.data.author.value.id)) {
		await fetchArticleChanges(
			database,
			'author',
			document.data.author,
		);
	}

	database.articleChangesByAuthor.get(document.data.author.value.id)!.push(
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
async function fetchArticleChanges<
	K extends keyof ArticleChangeIndexParameters,
	V extends ArticleChangeIndexParameters[K],
>(
	database: Database,
	parameter: K,
	value: V,
): Promise<Document<ArticleChange>[] | undefined> {
	const parameterCapitalised = capitalise(parameter);
	const index = `GetArticleChangesBy${parameterCapitalised}`;

	const documents = await dispatchQuery<ArticleChange[]>(
		database,
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
		? database.articleChangesByArticleReference
		: database.articleChangesByAuthor;

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
async function getArticleChanges<
	K extends keyof ArticleChangeIndexParameters,
	V extends ArticleChangeIndexParameters[K],
>(
	database: Database,
	parameter: K,
	value: V,
): Promise<Document<ArticleChange>[] | undefined> {
	const argument =
		<string> (typeof value === 'object' ? (<Reference> value).value.id : value);

	const cache = parameter === 'articleReference'
		? database.articleChangesByArticleReference
		: database.articleChangesByAuthor;

	return cache.get(argument) ??
		await fetchArticleChanges(database, parameter, value);
}

/** Taking an array of articles, gets their most up-to-date state. */
async function processArticles(
	database: Database,
	documents: Document<Article>[],
): Promise<Document<Article>[] | undefined> {
	const documentsChanges = await Promise.all(
		documents.map((document) =>
			new Promise<[Document<Article>, Document<ArticleChange>[] | undefined]>(
				(
					resolve,
				) =>
					getArticleChanges(
						database,
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

export {
	changeArticle,
	createArticle,
	getArticleChanges,
	getArticles,
	processArticles,
};
