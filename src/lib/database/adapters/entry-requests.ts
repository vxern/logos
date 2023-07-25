import constants from "../../../constants/constants";
import { CacheAdapter, Database, dispatchQuery, getUserMentionByReference, stringifyValue } from "../database";
import { Document } from "../document";
import { EntryRequestIndexes } from "../indexes";
import { EntryRequest } from "../structs/entry-request";
import Fauna from "fauna";

const $ = Fauna.query;

const cache: CacheAdapter<EntryRequest, EntryRequestIndexes<Document<EntryRequest>>, "delete"> = {
	get: (client, _parameter, value) => {
		return client.database.cache.entryRequestBySubmitterAndGuild.get(value);
	},
	set: (client, _parameter, value, entryRequest) => {
		client.database.cache.entryRequestBySubmitterAndGuild.set(value, entryRequest);
	},
	delete: (client, _parameter, value, _entryRequest) => {
		return client.database.cache.entryRequestBySubmitterAndGuild.delete(value) ?? false;
	},
};

const adapter: Database["adapters"]["entryRequests"] = {
	prefetch: async (client) => {
		const documents = await dispatchQuery<EntryRequest[]>(
			client,
			$.Map(
				$.Paginate($.Documents($.Collection("EntryRequests"))),
				$.Lambda("entryRequest", $.Get($.Var("entryRequest"))),
			),
		);
		if (documents === undefined) {
			client.log.error("Failed to fetch all entry requests.");
			return;
		}

		for (const document of documents) {
			const submitterReferenceId = stringifyValue(document.data.submitter);
			const guildId = stringifyValue(document.data.guild);
			const compositeId = `${submitterReferenceId}${constants.symbols.meta.idSeparator}${guildId}`;

			cache.set(client, "submitterAndGuild", compositeId, document);
		}

		client.log.debug(`Fetched ${documents.length} entry request(s).`);
	},
	get: (client, parameter, parameterValue) => {
		const [submitter, guild] = parameterValue;
		const submitterReferenceId = stringifyValue(submitter);
		const guildId = stringifyValue(guild);
		const compositeId = `${submitterReferenceId}${constants.symbols.meta.idSeparator}${guildId}`;

		return cache.get(client, parameter, compositeId) as Document<EntryRequest> | undefined;
	},
	create: async (client, entryRequest) => {
		const document = await dispatchQuery<EntryRequest>(
			client,
			$.Create($.Collection("EntryRequests"), { data: entryRequest }),
		);

		const userMention = getUserMentionByReference(client, entryRequest.submitter);

		const submitterReferenceId = stringifyValue(entryRequest.submitter);
		const guildId = stringifyValue(entryRequest.guild);

		if (document === undefined) {
			client.log.error(`Failed to create entry request for ${userMention} on guild with ID ${guildId}.`);
			return undefined;
		}

		const compositeId = `${submitterReferenceId}${constants.symbols.meta.idSeparator}${guildId}`;

		cache.set(client, "submitterAndGuild", compositeId, document);

		client.log.debug(`Created entry request for ${userMention} on guild with ID ${guildId}.`);

		return document;
	},
	update: async (client, entryRequest) => {
		const document = await dispatchQuery<EntryRequest>(client, $.Update(entryRequest.ref, { data: entryRequest.data }));

		const submitterReferenceId = stringifyValue(entryRequest.data.submitter);
		const guildId = stringifyValue(entryRequest.data.guild);

		const userMention = getUserMentionByReference(client, entryRequest.data.submitter);

		if (document === undefined) {
			client.log.error(`Failed to update entry request for ${userMention} on guild with ID ${guildId}.`);
			return undefined;
		}

		const compositeId = `${submitterReferenceId}${constants.symbols.meta.idSeparator}${guildId}`;

		cache.set(client, "submitterAndGuild", compositeId, document);

		client.log.debug(`Updated entry request for ${userMention} on guild with ID ${guildId}.`);

		return document;
	},
};

export default adapter;
