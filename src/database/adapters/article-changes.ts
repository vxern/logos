import * as Fauna from 'fauna';
import { ArticleChange } from 'logos/src/database/structs/articles/article-change.ts';
import { Article, getMostRecentArticleContent } from 'logos/src/database/structs/articles/article.ts';
import { Document, Reference } from 'logos/src/database/structs/document.ts';
import { DatabaseAdapters, dispatchQuery } from 'logos/src/database/database.ts';
import { Client } from 'logos/src/client.ts';
import { capitalise } from 'logos/formatting.ts';

const $ = Fauna.query;

const adapter: DatabaseAdapters['articleChanges'] = {
	get: async (client, parameter, value) => {
		const argument = <string> (typeof value === 'object' ? (<Reference> value).value.id : value);

		const cache = parameter === 'articleReference'
			? client.database.cache.articleChangesByArticleReference
			: client.database.cache.articleChangesByAuthor;

		return cache.get(argument) ?? await adapter.fetch(client, parameter, value);
	},
	fetch: async (client, parameter, value) => {
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
			? client.database.cache.articleChangesByArticleReference
			: client.database.cache.articleChangesByAuthor;

		cache.set(typeof value === 'object' ? (<Reference> value).value.id : value, documents);

		client.log.debug(
			`Fetched ${documents.length} article change(s) whose ${parameterPrinted} matches the query '${value}'.`,
		);

		return documents;
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

		const promises = [];

		if (!client.database.cache.articleChangesByArticleReference.has(document.data.article.value.id)) {
			promises.push(
				adapter.fetch(client, 'articleReference', document.data.article).then(() =>
					client.database.cache.articleChangesByArticleReference.get(document.data.article.value.id)!
						.push(document)
				),
			);
		}

		if (!client.database.cache.articleChangesByAuthor.has(document.data.author.value.id)) {
			promises.push(
				adapter.fetch(client, 'author', document.data.author).then(() =>
					client.database.cache.articleChangesByAuthor.get(document.data.author.value.id)!.push(
						document,
					)
				),
			);
		}

		await Promise.all(promises);

		client.log.debug(`Created article change for article '${articleChange.content.title}'.`);

		return document;
	},
};

/** Taking an array of articles, gets their most up-to-date state. */
async function processArticles(
	client: Client,
	documents: Document<Article>[],
): Promise<Document<Article>[] | undefined> {
	const documentsChanges = await Promise.all(
		documents.map((document) =>
			new Promise<[Document<Article>, Document<ArticleChange>[] | undefined]>(
				(resolve) =>
					adapter.get(client, 'articleReference', document.ref)
						.then((changes) => resolve([document, changes])),
			)
		),
	);

	if (documentsChanges.map(([_document, changes]) => changes).includes(undefined)) {
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

export { processArticles };
export default adapter;
