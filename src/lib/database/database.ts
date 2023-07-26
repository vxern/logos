import * as Logos from "../../types";
import { Client } from "../client";
import { diagnosticMentionUser } from "../utils";
import { BaseDocumentProperties, Document } from "./document";
import {
	EntryRequestIndexes,
	GuildIndexes,
	IndexesSignature,
	PraiseIndexes,
	ReportIndexes,
	SuggestionIndexes,
	UserIndexes,
	WarningIndexes,
} from "./indexes";
import { EntryRequest } from "./structs/entry-request";
import { Guild } from "./structs/guild";
import { Praise } from "./structs/praise";
import { Report } from "./structs/report";
import { Suggestion } from "./structs/suggestion";
import { User } from "./structs/user";
import { Warning } from "./structs/warning";
import Fauna from "fauna";
import * as Sentry from "sentry";

type QueryTypes = "read" | "write" | "exists" | "other";
type GetReturnType<
	QueryType extends QueryTypes,
	ReturnTypeRaw,
	ReturnsData extends boolean,
	ReturnType = QueryType extends "read"
		? ReturnTypeRaw
		: ReturnTypeRaw extends Map<string, infer T>
		? T
		: ReturnTypeRaw,
> = {
	read: ReturnType | undefined;
	write: void;
	exists: boolean;
	other: void;
}[ReturnsData extends true ? "read" : QueryType];

type Query<
	Index extends IndexesSignature,
	QueryType extends QueryTypes,
	QueryFlags extends {
		takesParameter?: boolean;
		takesDocument?: boolean;
		takesStringifiedValue?: boolean;
		returnsData?: boolean;
		returnsPromise?: boolean;
	} = Record<string, unknown>,
	DataType extends BaseDocumentProperties = BaseDocumentProperties,
	ExtraParameters extends unknown[] = [],
> = <
	Parameter extends keyof Index,
	ParameterMetadata extends Index[Parameter],
	ParameterType extends ParameterMetadata[0] = ParameterMetadata[0],
	IndexReturnType extends ParameterMetadata[1] = ParameterMetadata[1],
	ReturnType = GetReturnType<QueryType, IndexReturnType, QueryFlags["returnsData"] extends true ? true : false>,
>(
	client: Client,
	...args: [
		...(QueryFlags["takesParameter"] extends false ? [] : [parameter: Parameter]),
		...(QueryFlags["takesParameter"] extends false
			? []
			: QueryFlags["takesStringifiedValue"] extends true
			? [value: string]
			: [parameterValue: ParameterType]),
		...(QueryType extends "write"
			? QueryFlags["takesDocument"] extends true
				? [document: Document<DataType>]
				: [object: DataType]
			: []),
		...(QueryType extends "other" ? ExtraParameters : []),
	]
) => QueryFlags["returnsPromise"] extends false ? ReturnType : Promise<ReturnType>;

type DatabaseAdapterRequiredMethods<DataType extends BaseDocumentProperties, Indexes extends IndexesSignature> = {
	readonly create: Query<Indexes, "write", { takesParameter: false; returnsData: true }, DataType>;
	readonly fetch: Query<Indexes, "read">;
	readonly prefetch: Query<Indexes, "other", { takesParameter: false }>;
};

type DatabaseAdapterOptionalMethods<DataType extends BaseDocumentProperties, Indexes extends IndexesSignature> = {
	readonly update: Query<Indexes, "write", { takesParameter: false; takesDocument: true; returnsData: true }, DataType>;
	readonly delete: Query<Indexes, "write", { takesParameter: false; takesDocument: true; returnsData: true }, DataType>;

	// These are helper functions. Perhaps they should be present somewhere else.
	readonly get: Query<Indexes, "read", { returnsPromise: false }, DataType>;
	readonly getOrFetch: Query<Indexes, "read", Record<string, unknown>, DataType>;
	readonly getOrFetchOrCreate: Query<Indexes, "other", { returnsData: true }, DataType, [id: bigint]>;
};

type DatabaseAdapter<
	DataType extends BaseDocumentProperties,
	Indexes extends IndexesSignature,
	SupportsMethods extends keyof DatabaseAdapterOptionalMethods<DataType, Indexes> = never,
	IsPrefetch extends boolean = false,
> = Omit<DatabaseAdapterRequiredMethods<DataType, Indexes>, IsPrefetch extends true ? "fetch" : "prefetch"> &
	Pick<DatabaseAdapterOptionalMethods<DataType, Indexes>, SupportsMethods>;

type CacheAdapterRequiredMethods<
	DataType extends BaseDocumentProperties,
	Indexes extends IndexesSignature,
	IsSingleton extends boolean = true,
> = {
	readonly get: Query<Indexes, "read", { takesStringifiedValue: true; returnsPromise: false }, DataType>;
	readonly set: Query<
		Indexes,
		"write",
		{ takesDocument: true; takesStringifiedValue: true; returnsPromise: false },
		DataType
	>;
} & (IsSingleton extends false
	? {
			readonly has: Query<Indexes, "exists", { takesStringifiedValue: true; returnsPromise: false }>;
			readonly setAll: Query<
				Indexes,
				"other",
				{ takesStringifiedValue: true; returnsPromise: false },
				DataType,
				[objects: Document<DataType>[]]
			>;
	  }
	: Record<string, unknown>);

type CacheAdapterOptionalMethods<DataType extends BaseDocumentProperties, Indexes extends IndexesSignature> = {
	readonly delete: Query<
		Indexes,
		"write",
		{ takesDocument: true; takesStringifiedValue: true; returnsPromise: false },
		DataType
	>;
};

type CacheAdapter<
	DataType extends BaseDocumentProperties,
	Indexes extends IndexesSignature,
	SupportsMethods extends keyof CacheAdapterOptionalMethods<DataType, Indexes> = never,
> = CacheAdapterRequiredMethods<
	DataType,
	Indexes,
	Indexes extends IndexesSignature<infer ReturnType> ? (ReturnType extends Map<unknown, unknown> ? false : true) : never
> &
	Pick<CacheAdapterOptionalMethods<DataType, Indexes>, SupportsMethods>;

/**
 * Provides a layer of abstraction over the database solution used to store data
 * and the Discord application.
 */
type Database = {
	/** Client used to interface with the Fauna database. */
	client: Fauna.Client;
	cache: {
		/**
		 * Cached entry requests.
		 *
		 * The keys are stringified user document references combined with guild IDs.\
		 * The values are entry request documents mapped by their stringified document reference.
		 */
		entryRequestBySubmitterAndGuild: Map<string, Document<EntryRequest>>;

		/**
		 * Cached guilds.
		 *
		 * The keys are guild IDs (snowflakes).\
		 * The values are the guild document with that guild ID.
		 */
		guildById: Map<string, Document<Guild>>;

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
		 * The keys are stringified user document references combined with guild IDs.\
		 * The values are report documents mapped by their stringified document reference.
		 */
		reportsByAuthorAndGuild: Map<string, Map<string, Document<Report>>>;

		/**
		 * Cached suggestions.
		 *
		 * The keys are stringified user document references combined with guild IDs.\
		 * The values are suggestion documents mapped by their stringified document reference.
		 */
		suggestionsByAuthorAndGuild: Map<string, Map<string, Document<Suggestion>>>;

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
	};
	adapters: {
		entryRequests: DatabaseAdapter<EntryRequest, EntryRequestIndexes, "get" | "update", true>;
		guilds: DatabaseAdapter<Guild, GuildIndexes, "getOrFetch" | "getOrFetchOrCreate" | "update">;
		praises: DatabaseAdapter<Praise, PraiseIndexes, "getOrFetch">;
		reports: DatabaseAdapter<Report, ReportIndexes, "get" | "update", true>;
		suggestions: DatabaseAdapter<Suggestion, SuggestionIndexes, "get" | "update", true>;
		users: DatabaseAdapter<User, UserIndexes, "getOrFetch" | "getOrFetchOrCreate" | "update">;
		warnings: DatabaseAdapter<Warning, WarningIndexes, "getOrFetch" | "delete">;
	};
	fetchPromises: {
		[K0 in keyof WithFetch]: {
			[K1 in Parameters<WithFetch[K0]["fetch"]>[1]]: Map<string, ReturnType<WithFetch[K0]["fetch"]>>;
		};
	};
};

/** Models a cache for storing the responses to dispatched {@link fetch()} queries. */
type WithFetch = {
	[K in
		keyof Database["adapters"] as "fetch" extends keyof Database["adapters"][K] ? K : never]: Database["adapters"][K];
};

/**
 * Sends a query to Fauna and returns the result, handling any errors that may
 * have occurred during dispatch.
 *
 * @param expression - Fauna expression (query).
 * @returns The response object.
 */
async function dispatchQuery<
	T extends BaseDocumentProperties | BaseDocumentProperties[],
	R = T extends (infer B extends BaseDocumentProperties)[]
		? Document<B>[]
		: T extends BaseDocumentProperties
		? Document<T>
		: never,
>(client: Client, expression: Fauna.Expr): Promise<R | undefined> {
	let result;
	try {
		result = await client.database.client.query(expression);
	} catch (exception) {
		if (!(exception instanceof Fauna.errors.FaunaError) || exception instanceof Fauna.errors.NotFound) {
			return undefined;
		}

		Sentry.captureException(exception);
		client.log.error(`${exception.message} ~ ${exception.description}`);

		return undefined;
	}

	if (!("data" in result)) {
		return undefined;
	}

	if (!Array.isArray(result.data)) {
		return result as unknown as R;
	}

	return result.data as unknown as R;
}

function mentionUser(user: Logos.User | undefined, id: bigint): string {
	return user === undefined ? `an unknown user (ID ${id})` : diagnosticMentionUser(user);
}

function getUserMentionByReference(client: Client, reference: Fauna.values.Ref): string {
	const document = client.database.cache.usersByReference.get(stringifyValue(reference));
	if (document === undefined) {
		return "an unknown, uncached user";
	}

	const id = BigInt(document.data.account.id);
	const user = client.cache.users.get(id);
	return mentionUser(user, id);
}

function stringifyValue(parameterValue: string | Fauna.values.Ref): string {
	if (parameterValue instanceof Fauna.values.Ref) {
		return parameterValue.value.id;
	}

	return parameterValue as string;
}

function setNested<MK, K, V>(map: Map<MK, Map<K, V>>, mapKey: MK, key: K, value: V): void {
	map.get(mapKey)?.set(key, value) ?? map.set(mapKey, new Map([[key, value]]));
}

export { dispatchQuery, getUserMentionByReference, mentionUser, setNested, stringifyValue };
export type { CacheAdapter, Database, WithFetch };
