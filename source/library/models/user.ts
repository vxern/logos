import type { Locale, LocalisationLanguage } from "logos:constants/languages";
import type { Client } from "logos/client";
import type { GameType } from "logos/models/guild-statistics";
import { type IdentifierData, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";

interface Account {
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

interface GameScores {
	totalScore: number;
	sessionCount: number;
}

type AuthorisationStatus = "authorised" | "rejected";

type CreateUserOptions = {
	createdAt?: number;
	account?: Account;
	scores?: Partial<Record<Locale, Partial<Record<GameType, GameScores>>>>;
} & IdentifierData<User>;

class User extends Model<{ collection: "Users"; idParts: ["userId"] }> {
	static readonly #initialScores: GameScores = { totalScore: 0, sessionCount: 1 };

	get userId(): string {
		return this.idParts[0];
	}

	readonly createdAt: number;
	account?: Account;
	scores?: Partial<Record<Locale, Partial<Record<GameType, GameScores>>>>;

	get preferredLanguage(): LocalisationLanguage | undefined {
		return this.account?.language;
	}

	set preferredLanguage(language: LocalisationLanguage | undefined) {
		if (this.account === undefined) {
			this.account = { language };
			return;
		}

		this.account.language = language;
	}

	constructor(database: DatabaseStore, { createdAt, account, scores, ...data }: CreateUserOptions) {
		super(database, data, { collection: "Users" });

		this.createdAt = createdAt ?? Date.now();
		this.account = account;
		this.scores = scores;
	}

	static getOrCreate(client: Client, data: CreateUserOptions): User | Promise<User> {
		const partialId = Model.buildPartialId<User>(data);
		if (client.documents.users.has(partialId)) {
			return client.documents.users.get(partialId)!;
		}

		return client.database.withSession(async (session) => {
			const userDocument = await session.get<User>(Model.buildId<User>(data, { collection: "Users" }));
			if (userDocument !== undefined) {
				return userDocument;
			}

			return session.set(new User(client.database, data));
		});
	}

	registerSession({ game, learningLocale }: { game: GameType; learningLocale: Locale }): void {
		if (this.scores === undefined) {
			this.scores = { [learningLocale]: { [game]: { ...User.#initialScores } } };
			return;
		}

		const statisticsForLocale = this.scores[learningLocale];
		if (statisticsForLocale === undefined) {
			this.scores[learningLocale] = { [game]: { ...User.#initialScores } };
			return;
		}

		const statisticsForGame = statisticsForLocale[game];
		if (statisticsForGame === undefined) {
			statisticsForLocale[game] = { ...User.#initialScores };
			return;
		}

		statisticsForGame.sessionCount += 1;
	}

	incrementScore({ game, learningLocale }: { game: GameType; learningLocale: Locale }): void {
		// We don't care about incrementing the score if the scores could not be found since at that point, we'd have a
		// bigger problem to think about: The scores being gone.
		const scoresForGame = this.scores?.[learningLocale]?.[game];
		if (scoresForGame === undefined) {
			return;
		}

		scoresForGame.totalScore += 1;
	}

	getGameScores({ game, learningLocale }: { game: GameType; learningLocale: Locale }): GameScores | undefined {
		return this.scores?.[learningLocale]?.[game];
	}

	isAuthorisedOn({ guildId }: { guildId: string }): boolean {
		if (this.account?.authorisedOn === undefined) {
			return false;
		}

		return this.account.authorisedOn.includes(guildId);
	}

	isRejectedOn({ guildId }: { guildId: string }): boolean {
		if (this.account?.rejectedOn === undefined) {
			return false;
		}

		return this.account.rejectedOn.includes(guildId);
	}

	getAuthorisationStatus({ guildId }: { guildId: string }): AuthorisationStatus | undefined {
		if (this.isAuthorisedOn({ guildId })) {
			return "authorised";
		}

		if (this.isRejectedOn({ guildId })) {
			return "rejected";
		}

		return undefined;
	}

	setAuthorisationStatus({ guildId, status }: { guildId: string; status: AuthorisationStatus }): void {
		const previousState = this.getAuthorisationStatus({ guildId });
		if (previousState !== undefined) {
			if (previousState === "authorised") {
				return;
			}

			this.clearAuthorisationStatus({ guildId, status: previousState });
		}

		switch (status) {
			case "authorised": {
				if (this.account === undefined) {
					this.account = { authorisedOn: [guildId] };
					return;
				}

				if (this.account.authorisedOn === undefined) {
					this.account.authorisedOn = [guildId];
				}

				this.account.authorisedOn.push(guildId);
				break;
			}
			case "rejected": {
				if (this.account === undefined) {
					this.account = { rejectedOn: [guildId] };
					return;
				}

				if (this.account.rejectedOn === undefined) {
					this.account.rejectedOn = [guildId];
					return;
				}

				this.account.rejectedOn.push(guildId);
				break;
			}
		}
	}

	clearAuthorisationStatus({ guildId, status }: { guildId: string; status: AuthorisationStatus }): void {
		switch (status) {
			case "authorised": {
				this.account!.authorisedOn!.splice(this.account!.authorisedOn!.indexOf(guildId), 1);
				break;
			}
			case "rejected": {
				this.account!.rejectedOn!.splice(this.account!.rejectedOn!.indexOf(guildId), 1);
				break;
			}
		}
	}
}

export { User };
export type { CreateUserOptions };
