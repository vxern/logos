import { Locale, LocalisationLanguage } from "../../constants/languages";
import {IdentifierData, MetadataOrIdentifierData, Model} from "./model";
import {Client} from "../client";

interface Account {
	/** User's Discord ID. */
	readonly id: string;

	/**
	 * User's preferred localisation language.
	 *
	 * @since v3.5.0
	 */
	language?: LocalisationLanguage;

	/** IDs of servers the user's entry request has been accepted on. */
	authorisedOn?: string[];

	/** IDs of servers the user's entry request has been rejected on. */
	rejectedOn?: string[];
}

/** @since v3.42.0 */
interface GameScores {
	pickMissingWord?: {
		totalScore: number;
		sessionCount: number;
	};
}

class User extends Model<{ idParts: ["userId"] }> {
	get userId(): string {
		return this._idParts[0]!;
	}

	readonly account: Account;

	scores?: Partial<Record<Locale, GameScores>>;

	constructor({
		createdAt,
		account,
		scores,
		...data
	}: {
		createdAt?: number;
		account?: Account;
		scores?: Partial<Record<Locale, GameScores>>;
	} & MetadataOrIdentifierData<User>) {
		if ("@metadata" in data) {
			super({
				createdAt,
				"@metadata": data["@metadata"],
			});
			this.account = account ?? { id: data["@metadata"]["@id"] }
		} else {
			super({
				createdAt,
				"@metadata": { "@collection": "Users", "@id": Model.buildPartialId<User>(data) },
			});
			this.account = account ?? { id: data.userId };
		}

		this.scores = scores;
	}

	static async getOrCreate(client: Client, data: IdentifierData<User>): Promise<User> {
		if (client.documents.users.has(data.userId)) {
			return client.documents.users.get(data.userId)!;
		}

		const { promise, resolve } = Promise.withResolvers<User>();

		await client.database.withSession(async (session) => {
			const userDocument = await session.get<User>(Model.buildId<User>(data, { collection: "Users" }));
			if (userDocument === undefined) {
				return;
			}

			resolve(userDocument);
		});

		await client.database.withSession(async (session) => {
			const userDocument = new User(data);

			await session.set(userDocument);
			await session.saveChanges();

			resolve(userDocument);
		});

		return promise;
	}
}

export { User };
