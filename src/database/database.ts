import { User as DiscordUser } from 'discordeno';
import * as Sentry from 'sentry';
import * as Fauna from 'fauna';
import articles from 'logos/src/database/adapters/articles.ts';
import articleChanges from 'logos/src/database/adapters/article-changes.ts';
import praises from 'logos/src/database/adapters/praises.ts';
import users from 'logos/src/database/adapters/users.ts';
import warnings from 'logos/src/database/adapters/warnings.ts';
import { Article, ArticleChange, Praise, User, Warning } from 'logos/src/database/structs/mod.ts';
import { Document, Reference } from 'logos/src/database/document.ts';
import {
	ArticleChangeIndexes,
	ArticleIndexes,
	PraiseIndexes,
	UserIndexes,
	WarningIndexes,
} from 'logos/src/database/indexes.ts';
import { Client } from 'logos/src/client.ts';
import { diagnosticMentionUser } from 'logos/src/utils.ts';

type IndexesSignature<T = unknown> = Record<string, [takes: string | Reference, returns: T]>;

type ParametrisedQuery<
	Index extends IndexesSignature,
	QueryType extends 'read' | 'write' | 'exists' | 'custom',
	IsCache extends boolean = false,
	DataType = never,
	ExtraParameters extends unknown[] = never,
> = <
	Parameter extends keyof Index,
	ParameterMetadata extends Index[Parameter],
	ParameterType = ParameterMetadata[0],
	ReturnType = ParameterMetadata[1] extends (infer T)[] ? Map<string, Document<T>> : Document<ParameterMetadata[1]>,
>(
	client: Client,
	parameter: Parameter,
	...args: [
		...IsCache extends true ? [value: string] : [parameterValue: ParameterType],
		...QueryType extends 'write' ? [object: Document<DataType>]
			: (QueryType extends 'custom' ? ExtraParameters : []),
	]
) => IsCache extends false ? Promise<ReturnType | undefined>
	: (QueryType extends 'read' ? (ReturnType | undefined) : (QueryType extends 'exists' ? boolean : void));

type DatabaseAdapterRequiredMethods<DataType, Indexes extends IndexesSignature> = {
	readonly create: (client: Client, object: DataType) => Promise<Document<DataType> | undefined>;
	readonly fetch: ParametrisedQuery<Indexes, 'read'>;
};

type DatabaseAdapterOptionalMethods<DataType, Indexes extends IndexesSignature> = {
	readonly update: ParametrisedQuery<Indexes, 'write'>;
	readonly delete: (client: Client, document: Document<DataType>) => Promise<Document<DataType> | undefined>;

	// These are helper functions. Perhaps they should be present somewhere else.
	readonly getOrFetch: ParametrisedQuery<Indexes, 'read'>;
	readonly getOrFetchOrCreate: ParametrisedQuery<Indexes, 'custom', false, never, [id: bigint]>;
};

type DatabaseAdapter<
	DataType,
	Indexes extends IndexesSignature,
	SupportsMethods extends keyof DatabaseAdapterOptionalMethods<DataType, Indexes> = never,
> =
	& DatabaseAdapterRequiredMethods<DataType, Indexes>
	& Pick<DatabaseAdapterOptionalMethods<DataType, Indexes>, SupportsMethods>;

type CacheAdapterRequiredMethods<DataType, Indexes extends IndexesSignature, IsSingleton extends boolean = true> =
	& {
		readonly get: ParametrisedQuery<Indexes, 'read', true, DataType>;
		readonly set: ParametrisedQuery<Indexes, 'write', true, DataType>;
	}
	& (IsSingleton extends false ? {
			readonly has: ParametrisedQuery<Indexes, 'exists', true>;
			readonly setAll: ParametrisedQuery<Indexes, 'custom', true, DataType, [objects: Document<DataType>[]]>;
		}
		// deno-lint-ignore ban-types
		: {});

type CacheAdapterOptionalMethods<DataType, Indexes extends IndexesSignature> = {
	readonly delete: ParametrisedQuery<Indexes, 'write', true, DataType>;
};

type CacheAdapter<
	DataType,
	Indexes extends IndexesSignature,
	SupportsMethods extends keyof CacheAdapterOptionalMethods<DataType, Indexes> = never,
> =
	& CacheAdapterRequiredMethods<
		DataType,
		Indexes,
		Indexes extends IndexesSignature<infer ReturnType> ? (ReturnType extends Map<unknown, unknown> ? false : true)
			: never
	>
	& Pick<CacheAdapterOptionalMethods<DataType, Indexes>, SupportsMethods>;

interface DatabaseAdapters {
	articleChanges: DatabaseAdapter<ArticleChange, ArticleChangeIndexes, 'getOrFetch'>;
	articles: DatabaseAdapter<Article, ArticleIndexes, 'getOrFetch'>;
	praises: DatabaseAdapter<Praise, PraiseIndexes, 'getOrFetch'>;
	users: DatabaseAdapter<User, UserIndexes, 'getOrFetchOrCreate'>;
	warnings: DatabaseAdapter<Warning, WarningIndexes, 'getOrFetch' | 'delete'>;
}

interface Cache {
	/**
	 * Cached users.
	 *
	 * The keys are stringified user document references.\
	 * The values are the user document with that reference.
	 */
	usersByReference: Map<string, Document<User>>;

	/**
	 * Cached users.
	 *
	 * The keys are Discord user IDs (snowflakes).\
	 * The values are the user document with that user ID.
	 */
	usersById: Map<string, Document<User>>;

	/**
	 * Cached article changes.
	 *
	 * The keys are stringified user document references.\
	 * The values are article change documents mapped by their stringified document reference.
	 */
	articleChangesByAuthor: Map<string, Map<string, Document<ArticleChange>>>;

	/**
	 * Cached article changes.
	 *
	 * The keys are stringified user document references.\
	 * The values are article change documents mapped by their stringified document reference.
	 */
	articleChangesByArticle: Map<string, Map<string, Document<ArticleChange>>>;

	/**
	 * Cached articles.
	 *
	 * The keys are stringified user document references.\
	 * The values are article documents mapped by their stringified document reference.
	 */
	articlesByAuthor: Map<string, Map<string, Document<Article>>>;

	/**
	 * Cached articles.
	 *
	 * The keys are languages.\
	 * The values are article documents mapped by their stringified document reference.
	 */
	articlesByLanguage: Map<string, Map<string, Document<Article>>>;

	/**
	 * Cached user warnings.
	 *
	 * The keys are stringified user document references.\
	 * The values are warning documents mapped by their stringified document reference.
	 */
	warningsByRecipient: Map<string, Map<string, Document<Warning>>>;

	/**
	 * Cached user praises.
	 *
	 * The keys are stringified user document references.\
	 * The values are praise documents mapped by their stringified document reference.
	 */
	praisesBySender: Map<string, Map<string, Document<Praise>>>;

	/**
	 * Cached user praises.
	 *
	 * The keys are stringified user document references.\
	 * The values are praise documents mapped by their stringified document reference.
	 */
	praisesByRecipient: Map<string, Map<string, Document<Praise>>>;
}

/**
 * Provides a layer of abstraction over the database solution used to store data
 * and the Discord application.
 */
type Database = Readonly<{
	/** Client used to interface with the Fauna database. */
	client: Fauna.Client;

	cache: Cache;

	adapters: DatabaseAdapters;
}>;

function createDatabase(): Database {
	return {
		client: new Fauna.Client({
			secret: Deno.env.get('FAUNA_SECRET')!,
			domain: 'db.us.fauna.com',
			scheme: 'https',
			port: 443,
		}),
		cache: {
			usersByReference: new Map(),
			usersById: new Map(),
			articlesByLanguage: new Map(),
			articlesByAuthor: new Map(),
			articleChangesByArticle: new Map(),
			articleChangesByAuthor: new Map(),
			warningsByRecipient: new Map(),
			praisesBySender: new Map(),
			praisesByRecipient: new Map(),
		},
		adapters: { articles, articleChanges, praises, users, warnings },
	};
}

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
	let result: Fauna.values.Document;
	try {
		result = await client.database.client.query(expression);
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
	const document = client.database.cache.usersByReference.get(reference.value.id);
	if (document === undefined) return `an unknown, uncached user`;

	const id = BigInt(document.data.account.id);
	const user = client.cache.users.get(id);
	return mentionUser(user, id);
}

function stringifyValue(parameterValue: unknown): string {
	if (typeof parameterValue === 'object') {
		return (parameterValue as Reference).value.id;
	}

	return parameterValue as string;
}

function setNested<MK, K, V>(map: Map<MK, Map<K, V>>, mapKey: MK, key: K, value: V): void {
	map.get(mapKey)?.set(key, value) ?? map.set(mapKey, new Map([[key, value]]));
}

export { createDatabase, dispatchQuery, getUserMentionByReference, mentionUser, setNested, stringifyValue };
export type { CacheAdapter, Database, DatabaseAdapters };
