import * as Fauna from 'fauna';
import { User } from 'logos/src/database/structs/users/user.ts';
import { Reference } from 'logos/src/database/structs/document.ts';
import {
	DatabaseAdapters,
	dispatchQuery,
	getUserMentionByReference,
	mentionUser,
} from 'logos/src/database/database.ts';

const $ = Fauna.query;

const adapter: DatabaseAdapters['users'] = {
	get: async (client, parameter, value) => {
		const cacheValue = parameter === 'reference'
			? client.database.cache.users.get((<Reference> value).value.id)
			: Array.from(client.database.cache.users.values()).find((document) => document.data.account.id === value);

		return cacheValue ?? await adapter.fetch(client, parameter, value);
	},
	fetch: async (client, parameter, value) => {
		const document = await dispatchQuery<User>(
			client,
			$.Get(
				parameter === 'reference' ? value : $.Match($.FaunaIndex('GetUserByID'), value),
			),
		);

		if (document === undefined) {
			const parameterPrinted = parameter === 'id' ? 'ID' : 'document reference';
			client.log.debug(`Couldn't find a user in the database whose ${parameterPrinted} matches '${value}'.`);
			return undefined;
		}

		client.database.cache.users.set(document.ref.value.id, document);

		const userMention = getUserMentionByReference(client, document.ref);
		client.log.debug(`Fetched user document for ${userMention}.`);

		return document;
	},
	create: async (client, user) => {
		const document = await dispatchQuery<User>(
			client,
			$.Create($.Collection('Users'), { data: user }),
		);

		const id = BigInt(user.account.id);
		const user_ = client.cache.users.get(id);
		const userMention = mentionUser(user_, id);

		if (document === undefined) {
			client.log.error(`Failed to create a user document in the database for ${userMention}.`);
			return undefined;
		}

		client.database.cache.users.set(document.ref.value.id, document);

		client.log.debug(`Created user document for ${userMention}.`);

		return document;
	},
};

const getOrCreateUser: typeof adapter.get = async (client, parameter, value) => {
	const cachedUser = await adapter.get(client, parameter, value);
	if (cachedUser !== undefined) return cachedUser;

	if (parameter === 'id') {
		return await adapter.create(client, { account: { id: <string> value } });
	}

	return undefined;
};

export { getOrCreateUser };
export default adapter;
