import {
	CacheAdapter,
	Database,
	dispatchQuery,
	getUserMentionByReference,
	mentionUser,
	stringifyValue,
} from "../database";
import { Document } from "../document";
import { UserIndexes, userIndexParameterToIndex } from "../indexes";
import { User } from "../structs/user";
import Fauna from "fauna";

const $ = Fauna.query;

const cache: CacheAdapter<User, UserIndexes<Document<User>>> = {
	get: (client, parameter, value) => {
		if (parameter === "reference") {
			return client.database.cache.usersByReference.get(value);
		}

		return client.database.cache.usersById.get(value);
	},
	set: (client, parameter, value, user) => {
		if (parameter === "reference") {
			client.database.cache.usersByReference.set(value, user);
			return;
		}

		client.database.cache.usersById.set(value, user);
	},
};

const adapter: Database["adapters"]["users"] = {
	fetch: async (client, parameter, parameterValue) => {
		const value = stringifyValue(parameterValue);

		const cachedPromise = client.database.fetchPromises.users[parameter].get(value);
		if (cachedPromise !== undefined) {
			return cachedPromise;
		}

		let query: Fauna.Expr;
		if (parameter === "reference") {
			query = $.Get(parameterValue);
		} else {
			const index = userIndexParameterToIndex[parameter as Exclude<typeof parameter, "reference">];
			query = $.Get($.Match(index, parameterValue));
		}

		const promise = dispatchQuery<User>(client, query);
		client.database.fetchPromises.users[parameter].set(value, promise);

		const document = await promise;
		client.database.fetchPromises.users[parameter].delete(value);

		if (document === undefined) {
			client.database.log.debug(`Couldn't find a user in the database whose '${parameter}' matches '${value}'.`);
			return undefined;
		}

		const referenceId = stringifyValue(document.ref);
		const id = document.data.account.id;

		cache.set(client, "reference", referenceId, document);
		cache.set(client, "id", id, document);

		const userMention = getUserMentionByReference(client, document.ref);
		client.database.log.debug(`Fetched user document for ${userMention}.`);

		return cache.get(client, parameter, value);
	},
	getOrFetch: async (client, parameter, parameterValue) => {
		const value = stringifyValue(parameterValue);

		return cache.get(client, parameter, value) ?? (await adapter.fetch(client, parameter, parameterValue));
	},
	getOrFetchOrCreate: async (client, parameter, parameterValue, id) => {
		const value = stringifyValue(parameterValue);

		return (
			cache.get(client, parameter, value) ??
			(await adapter.fetch(client, parameter, parameterValue)) ??
			adapter.create(client, {
				createdAt: Date.now(),
				account: { id: `${id}` },
			})
		);
	},
	create: async (client, user) => {
		const document = await dispatchQuery<User>(client, $.Create($.Collection("Users"), { data: user }));

		const idAsNumber = BigInt(user.account.id);
		const user_ = client.cache.users.get(idAsNumber);
		const userMention = mentionUser(user_, idAsNumber);

		if (document === undefined) {
			client.database.log.error(`Failed to create a user document in the database for ${userMention}.`);
			return undefined;
		}

		const referenceId = stringifyValue(document.ref);
		const id = user.account.id;

		cache.set(client, "reference", referenceId, document);
		cache.set(client, "id", id, document);

		client.database.log.debug(`Created user document for ${userMention}.`);

		return document;
	},
	update: async (client, user) => {
		const document = await dispatchQuery<User>(client, $.Update(user.ref, { data: user.data }));

		const idAsNumber = BigInt(user.data.account.id);
		const user_ = client.cache.users.get(idAsNumber);
		const userMention = mentionUser(user_, idAsNumber);

		if (document === undefined) {
			client.database.log.error(`Failed to create a user document in the database for ${userMention}.`);
			return undefined;
		}

		const referenceId = stringifyValue(document.ref);
		const id = user.data.account.id;

		cache.set(client, "reference", referenceId, document);
		cache.set(client, "id", id, document);

		client.database.log.debug(`Updated user document for ${userMention}.`);

		return document;
	},
};

export default adapter;
