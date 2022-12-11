import * as Fauna from 'fauna';
import { ArticleChange } from 'logos/src/database/structs/mod.ts';
import { Document } from 'logos/src/database/document.ts';
import {
	CacheAdapter,
	DatabaseAdapters,
	dispatchQuery,
	setNested,
	stringifyValue,
} from 'logos/src/database/database.ts';
import { ArticleChangeIndexes, articleChangeIndexParameterToIndex } from 'logos/src/database/indexes.ts';

const $ = Fauna.query;

const cache: CacheAdapter<ArticleChange, ArticleChangeIndexes<Map<string, Document<ArticleChange>>>> = {
	has: (client, parameter, value) => {
		if (parameter === 'author') {
			return client.database.cache.articleChangesByAuthor.has(value);
		}

		return client.database.cache.articleChangesByArticle.has(value);
	},
	get: (client, parameter, value) => {
		if (parameter === 'author') {
			return client.database.cache.articleChangesByAuthor.get(value);
		}

		return client.database.cache.articleChangesByArticle.get(value);
	},
	set: (client, parameter, value, articleChange) => {
		const articleChangeReferenceId = stringifyValue(articleChange.ref);

		if (parameter === 'author') {
			return setNested(
				client.database.cache.articleChangesByAuthor,
				value,
				articleChangeReferenceId,
				articleChange,
			);
		}

		return setNested(
			client.database.cache.articleChangesByArticle,
			value,
			articleChangeReferenceId,
			articleChange,
		);
	},
	setAll: (client, parameter, value, articleChanges) => {
		if (articleChanges.length === 0) {
			if (parameter === 'author') {
				client.database.cache.articleChangesByAuthor.set(value, new Map());
			} else {
				client.database.cache.articleChangesByArticle.set(value, new Map());
			}
			return;
		}

		for (const articleChange of articleChanges) {
			cache.set(client, parameter, value, articleChange);
		}
	},
};

const adapter: DatabaseAdapters['articleChanges'] = {
	fetch: async (client, parameter, parameterValue) => {
		const index = articleChangeIndexParameterToIndex[parameter];
		const value = stringifyValue(parameterValue);

		const documents = await dispatchQuery<ArticleChange[]>(
			client,
			$.Map(
				$.Paginate($.Match($.FaunaIndex(index), parameterValue as Fauna.ExprVal)),
				$.Lambda('articleChange', $.Get($.Var('articleChange'))),
			),
		);
		if (documents === undefined) {
			client.log.error(`Failed to fetch article changes whose '${parameter}' matches '${value}'.`);
			return undefined;
		}

		cache.setAll(client, parameter, value, documents);

		client.log.debug(
			`Fetched ${documents.length} article change(s) whose '${parameter}' matches the query '${value}'.`,
		);

		return cache.get(client, parameter, value);
	},
	getOrFetch: async (client, parameter, parameterValue) => {
		const value = stringifyValue(parameterValue);

		return cache.get(client, parameter, value) ?? await adapter.fetch(client, parameter, parameterValue);
	},
	create: async (client, articleChange) => {
		const document = await dispatchQuery<ArticleChange>(
			client,
			$.Create($.Collection('ArticleChanges'), { data: articleChange }),
		);
		if (document === undefined) {
			client.log.error('Failed to create article change.');
			return undefined;
		}

		const authorReferenceId = stringifyValue(articleChange.author);
		const articleReferenceId = stringifyValue(articleChange.article);

		const promises = [];
		if (!cache.has(client, 'author', authorReferenceId)) {
			client.log.debug(`Could not find article changes for author with reference ${authorReferenceId}, fetching...`);

			promises.push(adapter.fetch(client, 'author', articleChange.author));
		} else {
			cache.set(client, 'author', authorReferenceId, document);
		}

		if (!cache.has(client, 'article', articleReferenceId)) {
			client.log.debug(`Could not find article changes for article with reference ${articleReferenceId}, fetching...`);

			promises.push(adapter.fetch(client, 'article', articleChange.article));
		} else {
			cache.set(client, 'article', articleReferenceId, document);
		}
		await Promise.all(promises);

		client.log.debug('Created article change.');

		return document;
	},
};

export default adapter;
