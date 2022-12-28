// deno-lint-ignore-file ban-types
import { User as DiscordUser } from 'discordeno';
import * as Sentry from 'sentry';
import * as Fauna from 'fauna';
import articles from 'logos/src/database/adapters/articles.ts';
import articleChanges from 'logos/src/database/adapters/article-changes.ts';
import entryRequests from 'logos/src/database/adapters/entry-requests.ts';
import praises from 'logos/src/database/adapters/praises.ts';
import reports from 'logos/src/database/adapters/reports.ts';
import users from 'logos/src/database/adapters/users.ts';
import warnings from 'logos/src/database/adapters/warnings.ts';
import { Article, ArticleChange, EntryRequest, Praise, Report, User, Warning } from 'logos/src/database/structs/mod.ts';
import { Document, Reference } from 'logos/src/database/document.ts';
import {
	ArticleChangeIndexes,
	ArticleIndexes,
	EntryRequestIndexes,
	IndexesSignature,
	PraiseIndexes,
	ReportIndexes,
	UserIndexes,
	WarningIndexes,
} from 'logos/src/database/indexes.ts';
import { Client } from 'logos/src/client.ts';
import { diagnosticMentionUser } from 'logos/src/utils.ts';

type QueryTypes = 'read' | 'write' | 'exists' | 'other';
type GetReturnType<
	QueryType extends QueryTypes,
	ReturnTypeRaw,
	ReturnsData extends boolean,
	ReturnType = QueryType extends 'read' ? ReturnTypeRaw
		: (ReturnTypeRaw extends Map<string, infer T> ? T : ReturnTypeRaw),
> = {
	'read': ReturnType | undefined;
	'write': void;
	'exists': boolean;
	'other': void;
}[ReturnsData extends true ? 'read' : QueryType];

type Query<
	Index extends IndexesSignature,
	QueryType extends QueryTypes,
	QueryFlags extends {
		takesParameter?: boolean;
		takesDocument?: boolean;
		takesStringifiedValue?: boolean;
		returnsData?: boolean;
		returnsPromise?: boolean;
	} = {},
	DataType = unknown,
	ExtraParameters extends unknown[] = [],
> = <
	Parameter extends keyof Index,
	ParameterMetadata extends Index[Parameter],
	ParameterType extends ParameterMetadata[0] = ParameterMetadata[0],
	IndexReturnType extends ParameterMetadata[1] = ParameterMetadata[1],
	ReturnType = GetReturnType<QueryType, IndexReturnType, QueryFlags['returnsData'] extends true ? true : false>,
>(
	client: Client,
	...args: [
		...QueryFlags['takesParameter'] extends false ? [] : [parameter: Parameter],
		...QueryFlags['takesParameter'] extends false ? []
			: (QueryFlags['takesStringifiedValue'] extends true ? [value: string] : [parameterValue: ParameterType]),
		...QueryType extends 'write'
			? (QueryFlags['takesDocument'] extends true ? [document: Document<DataType>] : [object: DataType])
			: [],
		...QueryType extends 'other' ? ExtraParameters : [],
	]
) => QueryFlags['returnsPromise'] extends false ? ReturnType : Promise<ReturnType>;

type DatabaseAdapterRequiredMethods<DataType, Indexes extends IndexesSignature> = {
	readonly create: Query<Indexes, 'write', { takesParameter: false; returnsData: true }, DataType>;
	readonly fetch: Query<Indexes, 'read'>;
	readonly prefetch: Query<Indexes, 'other', { takesParameter: false }>;
};

type DatabaseAdapterOptionalMethods<DataType, Indexes extends IndexesSignature> = {
	readonly update: Query<Indexes, 'write', { takesParameter: false; takesDocument: true; returnsData: true }, DataType>;
	readonly delete: Query<Indexes, 'write', { takesParameter: false; takesDocument: true; returnsData: true }, DataType>;

	// These are helper functions. Perhaps they should be present somewhere else.
	readonly get: Query<Indexes, 'read', { returnsPromise: false }, DataType>;
	readonly getOrFetch: Query<Indexes, 'read', {}, DataType>;
	readonly getOrFetchOrCreate: Query<Indexes, 'other', { returnsData: true }, DataType, [id: bigint]>;
};

type DatabaseAdapter<
	DataType,
	Indexes extends IndexesSignature,
	SupportsMethods extends keyof DatabaseAdapterOptionalMethods<DataType, Indexes> = never,
	IsPrefetch extends boolean = false,
> =
	& Omit<DatabaseAdapterRequiredMethods<DataType, Indexes>, IsPrefetch extends true ? 'fetch' : 'prefetch'>
	& Pick<DatabaseAdapterOptionalMethods<DataType, Indexes>, SupportsMethods>;

type CacheAdapterRequiredMethods<DataType, Indexes extends IndexesSignature, IsSingleton extends boolean = true> =
	& {
		readonly get: Query<Indexes, 'read', { takesStringifiedValue: true; returnsPromise: false }, DataType>;
		readonly set: Query<
			Indexes,
			'write',
			{ takesDocument: true; takesStringifiedValue: true; returnsPromise: false },
			DataType
		>;
	}
	& (IsSingleton extends false ? {
			readonly has: Query<Indexes, 'exists', { takesStringifiedValue: true; returnsPromise: false }>;
			readonly setAll: Query<
				Indexes,
				'other',
				{ takesStringifiedValue: true; returnsPromise: false },
				DataType,
				[objects: Document<DataType>[]]
			>;
		}
		: {});

type CacheAdapterOptionalMethods<DataType, Indexes extends IndexesSignature> = {
	readonly delete: Query<
		Indexes,
		'write',
		{ takesDocument: true; takesStringifiedValue: true; returnsPromise: false },
		DataType
	>;
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
	entryRequests: DatabaseAdapter<EntryRequest, EntryRequestIndexes, 'get' | 'update', true>;
	praises: DatabaseAdapter<Praise, PraiseIndexes, 'getOrFetch'>;
	reports: DatabaseAdapter<Report, ReportIndexes, 'get' | 'update', true>;
	users: DatabaseAdapter<User, UserIndexes, 'getOrFetch' | 'getOrFetchOrCreate' | 'update'>;
	warnings: DatabaseAdapter<Warning, WarningIndexes, 'getOrFetch' | 'delete'>;
}

interface Cache extends Record<string, Map<string, unknown>> {
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
	 * Cached entry requests.
	 *
	 * The keys are stringified user document references concatenated with guild IDs.\
	 * The values are entry request documents mapped by their stringified document reference.
	 */
	entryRequestBySubmitterAndGuild: Map<string, Document<EntryRequest>>;

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

	/**
	 * Cached user reports.
	 *
	 * The keys are stringified user document references.\
	 * The values are report documents mapped by their stringified document reference.
	 */
	reportsByAuthorAndGuild: Map<string, Map<string, Document<Report>>>;

	/**
	 * Cached user reports.
	 *
	 * The keys are stringified user document references.\
	 * The values are report documents mapped by their stringified document reference.
	 */
	reportsByRecipientAndGuild: Map<string, Map<string, Document<Report>>>;

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
	 * Cached user warnings.
	 *
	 * The keys are stringified user document references.\
	 * The values are warning documents mapped by their stringified document reference.
	 */
	warningsByRecipient: Map<string, Map<string, Document<Warning>>>;
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
			articlesByLanguage: new Map(),
			articlesByAuthor: new Map(),
			articleChangesByArticle: new Map(),
			articleChangesByAuthor: new Map(),
			entryRequestBySubmitterAndGuild: new Map(),
			praisesBySender: new Map(),
			praisesByRecipient: new Map(),
			reportsByAuthorAndGuild: new Map(),
			reportsByRecipientAndGuild: new Map(),
			usersByReference: new Map(),
			usersById: new Map(),
			warningsByRecipient: new Map(),
		},
		adapters: { articles, articleChanges, entryRequests, reports, praises, users, warnings },
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
