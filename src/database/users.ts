import { faunadb } from '../../deps.ts';
import { Base } from './base.ts';
import { Document } from './structs/document.ts';
import { User } from './structs/users/user.ts';

const $ = faunadb.query;

class Users extends Base {
	/**
	 * Cached users.
	 *
	 * The keys are user IDs, and the values are the bearer of the ID.
	 */
	protected readonly users: Map<string, Document<User>> = new Map();

	/**
	 * Fetches a user document from the database.
	 *
	 * @param id - The user's Discord ID.
	 * @returns The user document or undefined.
	 */
	private async fetchUser(id: string): Promise<Document<User> | undefined> {
		const response = await this.dispatchQuery<User>(
			$.Get($.Match($.FaunaIndex('GetUserByID'), id)),
		);

		if (!response) return undefined;

		const user = response;

		this.users.set(id, user);

		return user;
	}

	/**
	 * Creates a user document in the database.
	 *
	 * @param user - The user object.
	 * @returns The created user document.
	 */
	private async createUser(user: User): Promise<Document<User>> {
		const document = await this.dispatchQuery<User>(
			$.Call('CreateUser', user),
		);

		this.users.set(user.account.id, document!);

		return document!;
	}

	/**
	 * Attempts to get a user object from cache, and if the user object does not
	 * exist, attempts to fetch it from the database. If the user object does not exist
	 * in the database, this method will create one.
	 *
	 * @param id - The ID of the user to get.
	 * @returns The user.
	 */
	async getUser(id: string): Promise<Document<User>> {
		return this.preprocessUser(
			this.users.get(id) ?? await this.fetchUser(id) ??
				await this.createUser({ account: { id: id } }),
		);
	}

	/**
	 * Taking a user document, carries out checks on the data before returning the
	 * fixed user object.
	 *
	 * @param document - The user document to process.
	 * @returns The processed user document.
	 */
	private preprocessUser(document: Document<User>): Document<User> {
		// TODO: Implement user preprocessing.

		return document;
	}
}

export { Users };
