import * as Fauna from 'fauna';
import { Article } from 'logos/src/database/structs/articles/article.ts';
import { Reference } from 'logos/src/database/structs/document.ts';
import { DatabaseAdapters, dispatchQuery } from 'logos/src/database/database.ts';
import { capitalise } from 'logos/formatting.ts';

const $ = Fauna.query;

const adapter: DatabaseAdapters['articles'] = {
	get: async (client, parameter, value) => {
		const argument = <string> (typeof value === 'object' ? (<Reference> value).value.id : value);

		const cache = parameter === 'language'
			? client.database.cache.articlesByLanguage
			: client.database.cache.articlesByAuthor;

		if (cache.has(argument)) {
			return Array.from(cache.get(argument)!.values());
		}

		return await adapter.fetch(client, parameter, value);
	},
	fetch: async (client, parameter, value) => {
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

		const cache = parameter === 'language'
			? client.database.cache.articlesByLanguage
			: client.database.cache.articlesByAuthor;

		if (!cache.has(argument)) {
			cache.set(argument, new Map());
		}

		const map = cache.get(argument)!;
		for (const document of documents) {
			map.set(document.ref.value.id, document);
		}

		client.log.debug(`Fetched ${documents.length} article(s) whose ${parameter} matches the query '${value}'.`);

		return documents;
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

		if (!client.database.cache.articlesByLanguage.has(article.language)) {
			await adapter.fetch(client, 'language', article.language);
		}
		client.database.cache.articlesByLanguage.get(article.language)!.set(
			document.ref.value.id,
			document,
		);

		if (!client.database.cache.articlesByAuthor.has(article.author.value.id)) {
			await adapter.fetch(client, 'author', article.author);
		}
		client.database.cache.articlesByAuthor.get(article.author.value.id)!.set(
			document.ref.value.id,
			document,
		);

		client.log.debug(`Created article '${article.content.title}'.`);

		return document;
	},
};

export default adapter;
