import { User as DiscordUser } from 'discordeno';
import * as Sentry from 'sentry';
import * as Fauna from 'fauna';
import { ArticleChange } from 'logos/src/database/structs/articles/article-change.ts';
import { Article } from 'logos/src/database/structs/articles/article.ts';
import { Praise } from 'logos/src/database/structs/users/praise.ts';
import { User } from 'logos/src/database/structs/users/user.ts';
import { Warning } from 'logos/src/database/structs/users/warning.ts';
import { Document, Reference } from 'logos/src/database/structs/document.ts';
import { Client } from 'logos/src/client.ts';
import { diagnosticMentionUser } from 'logos/src/utils.ts';
import { Language } from 'logos/types.ts';

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
		client: Fauna.Client;

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
		client: new Fauna.Client({
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
	client: Client,
	expression: Fauna.Expr,
): Promise<R | undefined> {
	let result;
	try {
		result = await client.database.client.query<Record<string, unknown>>(expression);
	} catch (exception) {
		if (exception.name === 'NotFound') return undefined;

		Sentry.captureException(exception);
		client.log.error(`${exception.message} ~ ${exception.description}`);

		return undefined;
	}

	if (!Array.isArray(result.data)) {
		result.ts = convertToMilliseconds(<number> result.ts);

		return <R> (<unknown> result);
	}

	for (const element of result.data) {
		element.ts = convertToMilliseconds(<number> element.ts);
	}

	return <R> (<unknown> result.data);
}

function convertToMilliseconds(number: number): number {
	return number / 1000;
}

function mentionUser(user: DiscordUser | undefined, id: bigint): string {
	return user === undefined ? `an unknown user (ID ${id})` : diagnosticMentionUser(user, true);
}

function getUserMentionByReference(client: Client, reference: Reference): string {
	const userDocument = client.database.users.get(reference.value.id);
	if (userDocument === undefined) return `an unknown, uncached user`;

	const id = BigInt(userDocument.data.account.id);
	const user = client.cache.users.get(id);
	return mentionUser(user, id);
}

export type { Database };
export { createDatabase, dispatchQuery, getUserMentionByReference, mentionUser };
