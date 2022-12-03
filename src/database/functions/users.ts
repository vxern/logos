import * as Fauna from 'fauna';
import { User } from 'logos/src/database/structs/users/user.ts';
import { Document, Reference } from 'logos/src/database/structs/document.ts';
import { dispatchQuery, getUserMentionByReference, mentionUser } from 'logos/src/database/database.ts';
import { Client } from 'logos/src/client.ts';

const $ = Fauna.query;

/** Defines parameters used in indexing users. */
interface UserIndexParameters {
	/** The reference to the user. */
	reference: Reference;

	/** The ID of the user. */
	id: string;
}

/**
 * Fetches a user document from the database.
 *
 * @param parameter - The parameter for indexing the database.
 * @param value - The value corresponding to the parameter.
 * @returns An array of user documents or undefined.
 */
async function fetchUser<
	K extends keyof UserIndexParameters,
	V extends UserIndexParameters[K],
>(
	client: Client,
	parameter: K,
	value: V,
): Promise<Document<User> | undefined> {
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

	client.database.users.set(document.ref.value.id, document);

	const userMention = getUserMentionByReference(client, document.ref);
	client.log.debug(`Fetched user document for ${userMention}.`);

	return document;
}

/**
 * Creates a user document in the database.
 *
 * @param user - The user object.
 * @returns The created user document.
 */
async function createUser(
	client: Client,
	user: User,
): Promise<Document<User> | undefined> {
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

	client.database.users.set(document.ref.value.id, document);

	client.log.debug(`Created user document for ${userMention}.`);

	return document;
}

/**
 * Attempts to get a user object from cache, and if the user object does not
 * exist, attempts to fetch it from the database. If the user object does not exist
 * in the database, database method will create one.
 *
 * @param parameter - The parameter for indexing the database.
 * @param value - The value corresponding to the parameter.
 * @returns The user document or undefined.
 */
async function getOrCreateUser<
	K extends keyof UserIndexParameters,
	V extends UserIndexParameters[K],
>(
	client: Client,
	parameter: K,
	value: V,
): Promise<Document<User> | undefined> {
	const cacheValue = parameter === 'reference'
		? client.database.users.get((<Reference> value).value.id)
		: Array.from(client.database.users.values()).find((document) => document.data.account.id === value);

	const cachedOrFetched = cacheValue ?? await fetchUser(client, parameter, value);
	if (cachedOrFetched !== undefined) return cachedOrFetched;

	if (parameter === 'id') {
		return await createUser(client, { account: { id: <string> value } });
	}

	return undefined;
}

export { getOrCreateUser };
