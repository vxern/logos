import {
	CacheAdapter,
	Database,
	dispatchQuery,
	getUserMentionByReference,
	setNested,
	stringifyValue,
} from "../database";
import { Document } from "../document";
import { WarningIndexes, warningIndexParameterToIndex } from "../indexes";
import { Warning } from "../structs/warning";
import Fauna from "fauna";

const $ = Fauna.query;

const cache: CacheAdapter<Warning, WarningIndexes<Map<string, Document<Warning>>>, "delete"> = {
	has: (client, _parameter, value) => {
		return client.database.cache.warningsByRecipient.has(value);
	},
	get: (client, _parameter, value) => {
		return client.database.cache.warningsByRecipient.get(value);
	},
	set: (client, _parameter, value, warning) => {
		const warningReferenceId = stringifyValue(warning.ref);

		setNested(client.database.cache.warningsByRecipient, value, warningReferenceId, warning);
	},
	setAll: (client, parameter, value, warnings) => {
		if (warnings.length === 0) {
			client.database.cache.warningsByRecipient.set(value, new Map());
			return;
		}

		for (const warning of warnings) {
			cache.set(client, parameter, value, warning);
		}
	},
	delete: (client, _parameter, value, warning) => {
		const warningReferenceId = stringifyValue(warning.ref);

		return client.database.cache.warningsByRecipient.get(value)?.delete(warningReferenceId) ?? false;
	},
};

const adapter: Database["adapters"]["warnings"] = {
	fetch: async (client, parameter, parameterValue) => {
		const index = warningIndexParameterToIndex[parameter];
		const value = stringifyValue(parameterValue);

		const cachedPromise = client.database.fetchPromises.warnings[parameter].get(value);
		if (cachedPromise !== undefined) {
			return cachedPromise;
		}

		const promise = dispatchQuery<Warning[]>(
			client,
			$.Map($.Paginate($.Match(index, parameterValue)), $.Lambda("warning", $.Get($.Var("warning")))),
		);
		client.database.fetchPromises.warnings[parameter].set(value, promise);

		const documents = await promise;
		client.database.fetchPromises.warnings[parameter].delete(value);

		if (documents === undefined) {
			client.database.log.error(`Failed to fetch warnings whose '${parameter}' matches '${value}'.`);
			return undefined;
		}

		cache.setAll(client, parameter, value, documents);

		client.database.log.debug(`Fetched ${documents.length} warning(s) whose '${parameter}' matches '${value}'.`);

		return cache.get(client, parameter, value);
	},
	getOrFetch: async (client, parameter, parameterValue) => {
		const value = stringifyValue(parameterValue);

		return cache.get(client, parameter, value) ?? (await adapter.fetch(client, parameter, parameterValue));
	},
	create: async (client, warning) => {
		const document = await dispatchQuery<Warning>(client, $.Create($.Collection("Warnings"), { data: warning }));

		const userMention = getUserMentionByReference(client, warning.recipient);

		if (document === undefined) {
			client.database.log.error(`Failed to create warning for ${userMention}.`);
			return undefined;
		}

		const recipientReferenceId = stringifyValue(warning.recipient);

		const promises = [];
		if (cache.has(client, "recipient", recipientReferenceId)) {
			cache.set(client, "recipient", recipientReferenceId, document);
		} else {
			client.database.log.debug(
				`Could not find warnings for recipient with reference ${recipientReferenceId}, fetching...`,
			);

			promises.push(adapter.fetch(client, "recipient", warning.recipient));
		}
		await Promise.all(promises);

		client.database.log.debug(`Created warning for ${userMention}.`);

		return document;
	},
	delete: async (client, warning) => {
		const document = await dispatchQuery<Warning>(client, $.Delete(warning.ref));

		const userMention = getUserMentionByReference(client, warning.data.recipient);

		if (document === undefined) {
			client.database.log.error(`Failed to delete warning given to ${userMention}.`);
			return undefined;
		}

		const recipientId = stringifyValue(warning.data.recipient);

		cache.delete(client, "recipient", recipientId, warning);

		client.database.log.debug(`Deleted warning given to ${userMention}.`);

		return document;
	},
};

export default adapter;
