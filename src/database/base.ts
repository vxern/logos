import { faunadb } from '../../deps.ts';
import secrets from '../../secrets.ts';
import { Unpacked } from '../utils.ts';
import { Document } from './structs/document.ts';

/**
 * Provides a layer of abstraction over the database solution used to store data,
 * and the Discord application.
 */
class Base {
	/** Client used to interface with the Fauna database. */
	private readonly client: faunadb.Client;

	/** Constructs a database. */
	constructor() {
		this.client = new faunadb.Client({
			secret: secrets.core.database.secret,
			domain: 'db.us.fauna.com',
			scheme: 'https',
			port: 443,
		});
	}

	/**
	 * Sends a query to Fauna and returns the result, handling any errors that may
	 * have occurred during dispatch.
	 *
	 * @param expression - Fauna expression (query).
	 * @returns The response object.
	 */
	async dispatchQuery<
		T extends unknown | unknown[],
		R = T extends [] ? Document<Unpacked<T>>[] : Document<T>,
	>(
		expression: faunadb.Expr,
	): Promise<R | undefined> {
		try {
			const queryResult = (await this.client.query(expression)) as Record<
				string,
				unknown
			>;

			return queryResult! as R;
		} catch (error) {
			if (error.description === 'Set not found.') return undefined;

			console.error(`${error.message} ~ ${error.description}`);
		}

		return undefined;
	}
}

export { Base };
