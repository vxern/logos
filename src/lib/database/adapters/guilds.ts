import { defaultLanguage } from "../../../types.js";
import { CacheAdapter, Database, dispatchQuery, stringifyValue } from "../database.js";
import { Document } from "../document.js";
import { GuildIndexes, guildIndexParameterToIndex } from "../indexes.js";
import { Guild } from "../structs/guild.js";
import Fauna from "fauna";

const $ = Fauna.query;

const cache: CacheAdapter<Guild, GuildIndexes<Document<Guild>>> = {
	get: (client, _parameter, value) => {
		return client.database.cache.guildById.get(value);
	},
	set: (client, _parameter, value, guild) => {
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
			client.log.debug(`Couldn't find a guild in the database whose '${parameter}' matches '${value}'.`);
			return undefined;
		}

		const id = document.data.id;

		cache.set(client, "id", id, document);

		client.log.debug(`Fetched guild with ID ${id}.`);

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
				language: defaultLanguage,
				features: {
					information: {
						enabled: false,
						features: { journaling: { enabled: false }, suggestions: { enabled: false } },
					},
					moderation: {
						enabled: false,
						features: {
							purging: { enabled: false },
							warns: { enabled: false },
							reports: { enabled: false },
						},
					},
					music: {
						enabled: true,
						features: { dynamicVoiceChannels: { enabled: false }, music: { enabled: true, implicitVolume: 100 } },
					},
					social: { enabled: false, features: { praises: { enabled: false } } },
				},
			})
		);
	},
	create: async (client, guild) => {
		const document = await dispatchQuery<Guild>(client, $.Create($.Collection("Guilds"), { data: guild }));

		if (document === undefined) {
			client.log.error(`Failed to create a guild document in the database for guild with ID ${guild.id}.`);
			return undefined;
		}

		const id = guild.id;

		cache.set(client, "id", id, document);

		client.log.debug(`Created guild document for guild with ID ${id}.`);

		return document;
	},
	update: async (client, guild) => {
		const document = await dispatchQuery<Guild>(client, $.Update(guild.ref, { data: guild.data }));

		if (document === undefined) {
			client.log.error(`Failed to update the guild document in the database for guild with ID ${guild.data.id}.`);
			return undefined;
		}

		const id = guild.data.id;

		cache.set(client, "id", id, document);

		client.log.debug(`Updated guild document for guild with ID ${id}.`);

		return document;
	},
};

export default adapter;
