import { CacheAdapter, Database, dispatchQuery, setNested, stringifyValue } from "../database";
import { Document } from "../document";
import { PraiseIndexes, praiseIndexParameterToIndex } from "../indexes";
import { Praise } from "../structs/praise";
import Fauna from "fauna";

const $ = Fauna.query;

const cache: CacheAdapter<Praise, PraiseIndexes<Map<string, Document<Praise>>>> = {
	has: (client, parameter, value) => {
		if (parameter === "sender") {
			return client.database.cache.praisesBySender.has(value);
		}

		return client.database.cache.praisesByRecipient.has(value);
	},
	get: (client, parameter, value) => {
		if (parameter === "sender") {
			return client.database.cache.praisesBySender.get(value);
		}

		return client.database.cache.praisesByRecipient.get(value);
	},
	set: (client, parameter, value, praise) => {
		const praiseReferenceId = stringifyValue(praise.ref);

		if (parameter === "sender") {
			setNested(client.database.cache.praisesBySender, value, praiseReferenceId, praise);
			return;
		}

		setNested(client.database.cache.praisesByRecipient, value, praiseReferenceId, praise);
	},
	setAll: (client, parameter, value, praises) => {
		if (praises.length === 0) {
			if (parameter === "sender") {
				client.database.cache.praisesBySender.set(value, new Map());
			} else {
				client.database.cache.praisesByRecipient.set(value, new Map());
			}
			return;
		}

		for (const praise of praises) {
			cache.set(client, parameter, value, praise);
		}
	},
};

const adapter: Database["adapters"]["praises"] = {
	fetch: async (client, parameter, parameterValue) => {
		const index = praiseIndexParameterToIndex[parameter];
		const value = stringifyValue(parameterValue);

		const cachedPromise = client.database.fetchPromises.praises[parameter].get(value);
		if (cachedPromise !== undefined) {
			return cachedPromise;
		}

		const promise = dispatchQuery<Praise[]>(
			client,
			$.Map($.Paginate($.Match($.Index(index), parameterValue)), $.Lambda("praise", $.Get($.Var("praise")))),
		);
		client.database.fetchPromises.praises[parameter].set(value, promise);

		const documents = await promise;
		client.database.fetchPromises.praises[parameter].delete(value);

		if (documents === undefined) {
			client.log.error(`Failed to fetch praises whose '${parameter}' matches '${value}'.`);
			return undefined;
		}

		cache.setAll(client, parameter, value, documents);

		client.log.debug(`Fetched ${documents.length} praise(s) whose '${parameter}' matches '${value}'.`);

		return cache.get(client, parameter, value);
	},
	getOrFetch: async (client, parameter, parameterValue) => {
		const value = stringifyValue(parameterValue);

		return cache.get(client, parameter, value) ?? (await adapter.fetch(client, parameter, parameterValue));
	},
	create: async (client, praise) => {
		const document = await dispatchQuery<Praise>(client, $.Create($.Collection("Praises"), { data: praise }));

		const senderReferenceId = stringifyValue(praise.sender);
		const recipientReferenceId = stringifyValue(praise.recipient);

		if (document === undefined) {
			client.log.error(
				`Failed to create praise sent by user with reference '${senderReferenceId}' to user with reference '${recipientReferenceId}'.`,
			);
			return undefined;
		}

		const promises = [];
		if (cache.has(client, "sender", senderReferenceId)) {
			cache.set(client, "sender", senderReferenceId, document);
		} else {
			client.log.debug(`Could not find praises for sender with reference ${senderReferenceId}, fetching...`);

			promises.push(adapter.fetch(client, "sender", praise.sender));
		}

		if (cache.has(client, "recipient", recipientReferenceId)) {
			cache.set(client, "recipient", recipientReferenceId, document);
		} else {
			client.log.debug(`Could not find praises for recipient with reference ${recipientReferenceId}, fetching...`);

			promises.push(adapter.fetch(client, "recipient", praise.recipient));
		}
		await Promise.all(promises);

		client.log.debug(
			`Created praise sent by user with reference '${senderReferenceId}' to user with reference '${recipientReferenceId}'.`,
		);

		return document;
	},
};

export default adapter;
