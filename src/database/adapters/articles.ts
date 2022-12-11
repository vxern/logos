import * as Fauna from 'fauna';
import { Article } from 'logos/src/database/structs/mod.ts';
import {
	CacheAdapter,
	DatabaseAdapters,
	dispatchQuery,
	setNested,
	stringifyValue,
} from 'logos/src/database/database.ts';
import { Document } from 'logos/src/database/document.ts';
import { ArticleIndexes, articleIndexParameterToIndex } from 'logos/src/database/indexes.ts';

const $ = Fauna.query;

const cache: CacheAdapter<Article, ArticleIndexes<Map<string, Document<Article>>>> = {
	has: (client, parameter, value) => {
		if (parameter === 'author') {
			return client.database.cache.articlesByAuthor.has(value);
		}

		return client.database.cache.articlesByLanguage.has(value);
	},
	get: (client, parameter, value) => {
		if (parameter === 'author') {
			return client.database.cache.articlesByAuthor.get(value);
		}

		return client.database.cache.articlesByLanguage.get(value);
	},
	set: (client, parameter, value, article) => {
		const articleReferenceId = stringifyValue(article.ref);

		if (parameter === 'author') {
			return setNested(client.database.cache.articlesByAuthor, value, articleReferenceId, article);
		}

		return setNested(client.database.cache.articlesByLanguage, value, articleReferenceId, article);
	},
	setAll: (client, parameter, value, articles) => {
		if (articles.length === 0) {
			if (parameter === 'author') {
				client.database.cache.articlesByAuthor.set(value, new Map());
			} else {
				client.database.cache.articlesByLanguage.set(value, new Map());
			}
			return;
		}

		for (const article of articles) {
			cache.set(client, parameter, value, article);
		}
	},
};

const adapter: DatabaseAdapters['articles'] = {
	fetch: async (client, parameter, parameterValue) => {
		const index = articleIndexParameterToIndex[parameter];
		const value = stringifyValue(parameterValue);

		const documents = await dispatchQuery<Article[]>(
			client,
			$.Map(
				$.Paginate($.Match($.FaunaIndex(index), parameterValue as Fauna.ExprVal)),
				$.Lambda('article', $.Get($.Var('article'))),
			),
		);
		if (documents === undefined) {
			client.log.error(`Failed to fetch articles whose '${parameter}' matches '${value}'.`);
			return undefined;
		}

		cache.setAll(client, parameter, value, documents);

		client.log.debug(`Fetched ${documents.length} article(s) whose '${parameter}' matches '${value}'.`);

		return cache.get(client, parameter, value);
	},
	getOrFetch: async (client, parameter, parameterValue) => {
		const value = stringifyValue(parameterValue);

		return cache.get(client, parameter, value) ?? await adapter.fetch(client, parameter, parameterValue);
	},
	create: async (client, article) => {
		const document = await dispatchQuery<Article>(
			client,
			$.Create($.Collection('Articles'), { data: article }),
		);
		if (document === undefined) {
			client.log.error(`Failed to create article '${article.content.title}'.`);
			return undefined;
		}

		const authorReferenceId = stringifyValue(article.author);
		const language = stringifyValue(article.language);

		const promises = [];
		if (!cache.has(client, 'author', authorReferenceId)) {
			client.log.debug(`Could not find articles for author with reference ${authorReferenceId}, fetching...`);

			promises.push(adapter.fetch(client, 'author', article.author));
		} else {
			cache.set(client, 'author', authorReferenceId, document);
		}

		if (!cache.has(client, 'language', language)) {
			client.log.debug(`Could not find articles for language ${language}, fetching...`);

			promises.push(adapter.fetch(client, 'language', article.language));
		} else {
			cache.set(client, 'language', language, document);
		}
		await Promise.all(promises);

		client.log.debug(`Created article '${article.content.title}'.`);

		return document;
	},
};

export default adapter;
