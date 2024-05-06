import { Locale, LocalisationLanguage } from "logos:constants/languages";
import { Client } from "logos/client";
import { GameType } from "logos/database/guild-stats";
import { IdentifierData, Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

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

interface GameScores {
	totalScore: number;
	sessionCount: number;
}

type AuthorisationStatus = "authorised" | "rejected";

class User extends Model<{ collection: "Users"; idParts: ["userId"] }> {
	static readonly #_initialScores: GameScores = { totalScore: 0, sessionCount: 1 };

	get userId(): string {
		return this.idParts[0];
	}

	readonly createdAt: number;
	readonly account: Account;

	scores?: Partial<Record<Locale, Partial<Record<GameType, GameScores>>>>;

	get preferredLanguage(): LocalisationLanguage | undefined {
		return this.account.language;
	}

	set preferredLanguage(language: LocalisationLanguage | undefined) {
		this.account.language = language;
	}

	constructor(
		database: DatabaseStore,
		{
			createdAt,
			account,
			scores,
			...data
		}: {
			createdAt?: number;
			account?: Account;
			scores?: Partial<Record<Locale, Partial<Record<GameType, GameScores>>>>;
		} & IdentifierData<User>,
	) {
		super(database, data, { collection: "Users" });

		this.createdAt = createdAt ?? Date.now();
		this.account = account ?? { id: this.userId };
		this.scores = scores;
	}

	static async getOrCreate(client: Client, data: IdentifierData<User>): Promise<User> {
		const partialId = Model.buildPartialId(data);
		if (client.documents.users.has(partialId)) {
			return client.documents.users.get(partialId)!;
		}

		return await client.database.withSession(async (session) => {
			const userDocument = await session.get<User>(Model.buildId(data, { collection: "Users" }));
			if (userDocument !== undefined) {
				return userDocument;
			}

			return session.set(new User(client.database, data));
		});
	}

	registerSession({ game, learningLocale }: { game: GameType; learningLocale: Locale }): void {
		if (this.scores === undefined) {
			this.scores = { [learningLocale]: { [game]: { ...User.#_initialScores } } };
			return;
		}

		const statsForLocale = this.scores[learningLocale];
		if (statsForLocale === undefined) {
			this.scores[learningLocale] = { [game]: { ...User.#_initialScores } };
			return;
		}

		const statsForGame = statsForLocale[game];
		if (statsForGame === undefined) {
			statsForLocale[game] = { ...User.#_initialScores };
			return;
		}

		statsForGame.sessionCount += 1;
	}

	incrementScore({ game, learningLocale }: { game: GameType; learningLocale: Locale }): void {
		// * We don't care about incrementing the score if the scores could not be found.
		// * At that point, we have a bigger problem to think about - the scores being gone.
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
		if (this.account.authorisedOn === undefined) {
			return false;
		}

		return this.account.authorisedOn.includes(guildId);
	}

	isRejectedOn({ guildId }: { guildId: string }): boolean {
		if (this.account.rejectedOn === undefined) {
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
				if (this.account.authorisedOn === undefined) {
					this.account.authorisedOn = [guildId];
					return;
				}

				this.account.authorisedOn.push(guildId);
				break;
			}
			case "rejected": {
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
				this.account.authorisedOn!.splice(this.account.authorisedOn!.indexOf(guildId), 1);
				break;
			}
			case "rejected": {
				this.account.rejectedOn!.splice(this.account.rejectedOn!.indexOf(guildId), 1);
				break;
			}
		}
	}
}

export { User };
