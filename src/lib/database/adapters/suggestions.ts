import Fauna from "fauna";
import { Suggestion } from "../structs/suggestion.js";
import {
	CacheAdapter,
	DatabaseAdapters,
	dispatchQuery,
	getUserMentionByReference,
	setNested,
	stringifyValue,
} from "../database.js";
import { Document } from "../document.js";
import { SuggestionIndexes } from "../indexes.js";

const $ = Fauna.query;

const cache: CacheAdapter<Suggestion, SuggestionIndexes<Document<Suggestion>>, "delete"> = {
	get: (client, _parameter, value) => {
		return client.database.cache.suggestionsByAuthorAndGuild.get(value);
	},
	set: (client, _parameter, value, suggestion) => {
		const suggestionReferenceId = stringifyValue(suggestion.ref);

		return setNested(client.database.cache.suggestionsByAuthorAndGuild, value, suggestionReferenceId, suggestion);
	},
	delete: (client, _parameter, value, suggestion) => {
		const suggestionReferenceId = stringifyValue(suggestion.ref);

		return client.database.cache.suggestionsByAuthorAndGuild.get(value)?.delete(suggestionReferenceId) ?? false;
	},
};

const adapter: DatabaseAdapters["suggestions"] = {
	prefetch: async (client) => {
		const documents = await dispatchQuery<Suggestion[]>(
			client,
			$.Map($.Paginate($.Documents($.Collection("Suggestions"))), $.Lambda("suggestion", $.Get($.Var("suggestion")))),
		);
		if (documents === undefined) {
			client.log.error("Failed to fetch all suggestions.");
			return;
		}

		for (const document of documents) {
			const authorReferenceId = stringifyValue(document.data.author);
			const guildId = stringifyValue(document.data.guild);
			const compositeId = `${authorReferenceId}${guildId}`;

			cache.set(client, "authorAndGuild", compositeId, document);
		}

		client.log.debug(`Fetched ${documents.length} suggestion(s).`);
	},
	get: (client, parameter, parameterValue) => {
		const [author, guild] = parameterValue;
		const authorReferenceId = stringifyValue(author);
		const guildId = stringifyValue(guild);
		const compositeId = `${authorReferenceId}${guildId}`;

		return cache.get(client, parameter, compositeId) as Document<Suggestion> | undefined;
	},
	create: async (client, suggestion) => {
		const document = await dispatchQuery<Suggestion>(
			client,
			$.Create($.Collection("Suggestions"), { data: suggestion }),
		);

		const authorReferenceId = stringifyValue(suggestion.author);
		const guildId = stringifyValue(suggestion.guild);

		const userMention = getUserMentionByReference(client, suggestion.author);

		if (document === undefined) {
			client.log.error(`Failed to create suggestion submitted by ${userMention} on guild with ID ${guildId}.`);
			return undefined;
		}

		const compositeId = `${authorReferenceId}${guildId}`;

		cache.set(client, "authorAndGuild", compositeId, document);

		client.log.debug(`Created suggestion submitted by ${userMention} on guild with ID ${guildId}.`);

		return document;
	},
	update: async (client, suggestion) => {
		const document = await dispatchQuery<Suggestion>(client, $.Update(suggestion.ref, { data: suggestion.data }));

		const authorReferenceId = stringifyValue(suggestion.data.author);
		const guildId = stringifyValue(suggestion.data.guild);

		const userMention = getUserMentionByReference(client, suggestion.data.author);

		if (document === undefined) {
			client.log.error(`Failed to update suggestion submitted by ${userMention} on guild with ID ${guildId}.`);
			return undefined;
		}

		const compositeId = `${authorReferenceId}${guildId}`;

		cache.set(client, "authorAndGuild", compositeId, document);

		client.log.debug(`Updated suggestion submitted by ${userMention} on guild with ID ${guildId}.`);

		return document;
	},
};

export default adapter;
