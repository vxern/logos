import { faunadb } from '../../deps.ts';
import secrets from '../../secrets.ts';

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
	async dispatchQuery(expression: faunadb.Expr): Promise<any> {
		try {
			const queryResult = (await this.client.query(expression)) as any;

			// TODO: Use a precise data type for the query response.

			console.log(queryResult);

			return queryResult;
		} catch (error) {
			if (error.description === 'Set not found.') return undefined;

			console.error(`${error.message} ~ ${error.description}`);
		}

		return undefined;
	}
}

export { Base };
