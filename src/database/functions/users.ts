import { faunadb } from '../../../deps.ts';
import { Database, dispatchQuery } from '../database.ts';
import { Document, Reference } from '../structs/document.ts';
import { User } from '../structs/users/user.ts';

const $ = faunadb.query;

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
	database: Database,
	parameter: K,
	value: V,
): Promise<Document<User> | undefined> {
	const document = await dispatchQuery<User>(
		database,
		$.Get(
			parameter === 'reference'
				? value
				: $.Match($.FaunaIndex('GetUserByID'), value),
		),
	);

	if (!document) {
		console.error(
			`Failed to fetch user with ${`${parameter} ${value}`} from the database.`,
		);
		return undefined;
	}

	database.users.set(document.ref.value.id, document);

	return document;
}

/**
 * Creates a user document in the database.
 *
 * @param user - The user object.
 * @returns The created user document.
 */
async function createUser(
	database: Database,
	user: User,
): Promise<Document<User> | undefined> {
	const document = await dispatchQuery<User>(
		database,
		$.Create($.Collection('Users'), { data: user }),
	);

	if (!document) {
		console.error(
			`Failed to create a document for user ${user.account.id} in the database.`,
		);
		return undefined;
	}

	database.users.set(document.ref.value.id, document);

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
	database: Database,
	parameter: K,
	value: V,
): Promise<Document<User> | undefined> {
	const cacheValue = parameter === 'reference'
		? database.users.get((<Reference> value).value.id)
		: Array.from(database.users.values()).find((document) =>
			document.data.account.id === value
		);

	const cacheOrFetch = cacheValue ??
		await fetchUser(database, parameter, value);
	if (cacheOrFetch) return cacheOrFetch;

	if (parameter === 'id') {
		return await createUser(database, { account: { id: <string> value } });
	}

	return undefined;
}

export { getOrCreateUser };
