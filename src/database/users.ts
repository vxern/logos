import { faunadb } from "../../deps.ts";
import { Base } from "./base.ts";
import { User } from "./structs/users/user.ts";

const $ = faunadb.query;

class Users extends Base {
	/**
	 * Cached users.
	 *
	 * The keys are user IDs, and the values are the bearer of the ID.
	 */
	protected readonly users: Map<string, User> = new Map();

	/**
	 * Fetches a user document from the database.
	 *
	 * @param id - The user's Discord ID.
	 * @returns The user or undefined.
	 */
	private async fetchUser(id: string): Promise<User | undefined> {
		const response = await this.dispatchQuery(
			$.Get($.Match($.FaunaIndex('GetUserByID'), id)),
		);

		if (!response) return undefined;

		const user = response as User;

		this.users.set(id, user);

		return user;
	}

	/**
	 * Creates a user document in the database.
	 *
	 * @param id - The user's Discord ID.
	 * @returns The created user.
	 */
	private async createUser(id: string): Promise<User> {
		const userSkeleton: User = { account: { id: id } };

		const response = await this.dispatchQuery(
			$.Call('CreateUser', userSkeleton),
		);

		const user = response as User;

		this.users.set(id, user);

		return user;
	}

	/**
	 * Attempts to get a user object from cache, and if the user object does not
	 * exist, attempts to fetch it from the database. If the user object does not exist
	 * in the database, this method will create one.
	 *
	 * @param id - The ID of the user to get.
	 * @returns The user.
	 */
	async getUser(id: string): Promise<User> {
		return this.preprocessUser(
			this.users.get(id) ?? await this.fetchUser(id) ??
				await this.createUser(id),
		);
	}

	/**
	 * Taking a user, carries out checks on the data before returning the fixed user
	 * object.
	 *
	 * @param user - The user object to process.
	 * @returns The processed user document.
	 */
	private preprocessUser(user: User): User {
		// TODO: Implement user preprocessing.

		return user;
	}
}

export { Users };