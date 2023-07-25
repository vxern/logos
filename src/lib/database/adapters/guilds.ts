import { defaultLanguage } from "../../../types";
import { CacheAdapter, Database, dispatchQuery, stringifyValue } from "../database";
import { Document } from "../document";
import { GuildIndexes, guildIndexParameterToIndex } from "../indexes";
import { Guild } from "../structs/guild";
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
				isNative: false,
				language: defaultLanguage,
				features: {
					information: {
						enabled: true,
						features: {
							journaling: { enabled: false },
							notices: {
								enabled: false,
								features: {
									information: { enabled: false },
									roles: { enabled: false },
									welcome: { enabled: false },
								},
							},
						},
					},
					language: {
						enabled: true,
						features: {
							game: { enabled: false },
							resources: { enabled: false },
							translate: { enabled: true },
							word: { enabled: false },
						},
					},
					moderation: {
						enabled: true,
						features: {
							alerts: { enabled: false },
							policy: { enabled: false },
							rules: { enabled: false },
							timeouts: { enabled: true, journaling: true },
							purging: { enabled: true, journaling: true },
							warns: { enabled: true, journaling: true, limit: 3, autoTimeout: { enabled: false } },
							reports: { enabled: false },
							verification: { enabled: false },
						},
					},
					server: {
						enabled: true,
						features: {
							dynamicVoiceChannels: { enabled: false },
							entry: { enabled: false },
							suggestions: { enabled: false },
						},
					},
					social: {
						enabled: true,
						features: {
							music: {
								enabled: true,
								implicitVolume: 100,
							},
							praises: { enabled: true, journaling: true },
							profile: { enabled: false },
						},
					},
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
