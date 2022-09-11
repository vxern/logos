import { faunadb } from '../../deps.ts';
import { Article } from './structs/articles/article.ts';
import { ArticleChange } from './structs/articles/article-change.ts';
import { User } from './structs/users/user.ts';
import { Document } from './structs/document.ts';
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

/**
 * Provides a layer of abstraction over the database solution used to store data
 * and the Discord application.
 */
type Database =
	& Readonly<{
		/** Client used to interface with the Fauna database. */
		client: faunadb.Client;

		/**
		 * Cached users.
		 *
		 * The keys are user references, and the values are the corresponding user documents.
		 */
		users: Map<string, Document<User>>;

		/**
		 * Cached articles.
		 *
		 * The keys are language names, and the values are maps with article references as keys
		 * and article documents as values.
		 */
		articlesByLanguage: Map<Language, Map<string, Document<Article>>>;

		/**
		 * Cached articles.
		 *
		 * The keys are user references, and the values are maps with article references as keys
		 * and article documents as values.
		 */
		articlesByAuthor: Map<string, Map<string, Document<Article>>>;

		/**
		 * Cached article changes.
		 *
		 * The keys are article references, and the values are their respective article changes.
		 */
		articleChangesByArticleReference: Map<string, Document<ArticleChange>[]>;

		/**
		 * Cached article changes.
		 *
		 * The keys are user IDs, and the values are the user's respective article changes.
		 */
		articleChangesByAuthor: Map<string, Document<ArticleChange>[]>;

		/**
		 * Cached user warnings.
		 *
		 * The keys are user IDs, and the values are the user's respective warnings.
		 */
		warningsBySubject: Map<string, Document<Warning>[]>;

		/**
		 * Cached user praises.
		 *
		 * The keys are user IDs, and the values are the praises given by that same user.
		 */
		praisesByAuthor: Map<string, Document<Praise>[]>;

		/**
		 * Cached user praises.
		 *
		 * The keys are user IDs, and the values are the praises given to that same user.
		 */
		praisesBySubject: Map<string, Document<Praise>[]>;
	}>
	& {
		articlesFetched: boolean;
	};

function createDatabase(): Database {
	return {
		client: new faunadb.Client({
			secret: Deno.env.get('FAUNA_SECRET')!,
			domain: 'db.us.fauna.com',
			scheme: 'https',
			port: 443,
		}),
		users: new Map(),
		articlesByLanguage: new Map(),
		articlesByAuthor: new Map(),
		articleChangesByArticleReference: new Map(),
		articleChangesByAuthor: new Map(),
		warningsBySubject: new Map(),
		praisesByAuthor: new Map(),
		praisesBySubject: new Map(),
		articlesFetched: false,
	};
}

/**
 * Sends a query to Fauna and returns the result, handling any errors that may
 * have occurred during dispatch.
 *
 * @param expression - Fauna expression (query).
 * @returns The response object.
 */
async function dispatchQuery<
	T extends unknown | unknown[],
	B = Unpacked<T>,
	R = T extends Array<B> ? Document<B>[] : Document<T>,
>(
	database: Database,
	expression: faunadb.Expr,
): Promise<R | undefined> {
	try {
		const queryResult = <Record<
			string,
			unknown
		>> (await database.client.query(expression));

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

export type { Database };
export { createDatabase, dispatchQuery };
