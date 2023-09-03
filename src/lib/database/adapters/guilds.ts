import defaults from "../../../defaults";
import diagnostics from "../../diagnostics";
import { CacheAdapter, Database, dispatchQuery, stringifyValue } from "../database";
import { Document } from "../document";
import { GuildIndexes, guildIndexParameterToIndex } from "../indexes";
import { Guild } from "../structs/guild";
import Fauna from "fauna";

const $ = Fauna.query;

const cache: CacheAdapter<Guild, GuildIndexes<Document<Guild>>> = {
	get: (client, _, value) => {
		return client.database.cache.guildById.get(value);
	},
	set: (client, _, value, guild) => {
		client.database.cache.guildById.set(value, guild);
	},
};

const adapter: Database["adapters"]["guilds"] = {
	fetch: async (client, parameter, parameterValue) => {
		const index = guildIndexParameterToIndex[parameter];
		const value = stringifyValue(parameterValue);

		const cachedPromise = client.database.fetchPromises.guilds[parameter].get(value);
		if (cachedPromise !== undefined) {
			return cachedPromise;
		}

		const promise = dispatchQuery<Guild>(client, $.Get($.Match($.Index(index), parameterValue)));
		client.database.fetchPromises.guilds[parameter].set(value, promise);

		const document = await promise;
		client.database.fetchPromises.guilds[parameter].delete(value);

		if (document === undefined) {
			client.database.log.debug(`Couldn't find a guild in the database whose '${parameter}' matches '${value}'.`);
			return undefined;
		}

		const id = document.data.id;

		cache.set(client, "id", id, document);

		client.database.log.debug(`Fetched ${diagnostics.display.guild(id)}.`);

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
				id: id.toString(),
				isNative: false,
				languages: {
					localisation: defaults.LOCALISATION_LANGUAGE,
					target: defaults.LEARNING_LANGUAGE,
					feature: defaults.FEATURE_LANGUAGE,
				},
				features: {
					information: { enabled: false },
					language: { enabled: false },
					moderation: { enabled: false },
					server: { enabled: false },
					social: { enabled: false },
				},
			})
		);
	},
	create: async (client, guild) => {
		const document = await dispatchQuery<Guild>(client, $.Create($.Collection("Guilds"), { data: guild }));

		if (document === undefined) {
			client.database.log.error(
				`Failed to create a guild document in the database for ${diagnostics.display.guild(guild.id)}.`,
			);
			return undefined;
		}

		const id = guild.id;

		cache.set(client, "id", id, document);

		client.database.log.debug(`Created guild document for ${diagnostics.display.guild(id)}.`);

		return document;
	},
	update: async (client, guild) => {
		const document = await dispatchQuery<Guild>(client, $.Update(guild.ref, { data: guild.data }));

		if (document === undefined) {
			client.database.log.error(
				`Failed to update the guild document in the database for ${diagnostics.display.guild(guild.data.id)}.`,
			);
			return undefined;
		}

		const id = guild.data.id;

		cache.set(client, "id", id, document);

		client.database.log.debug(`Updated guild document for ${diagnostics.display.guild(id)}.`);

		return document;
	},
};

export default adapter;
