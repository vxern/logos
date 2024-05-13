import { Rule } from "logos:constants/rules";
import { Client } from "logos/client";
import { ClientOrDatabaseStore, IdentifierData, Model } from "logos/database/model";
import { DatabaseStore } from "logos/stores/database";

class Warning extends Model<{ collection: "Warnings"; idParts: ["guildId", "authorId", "targetId", "createdAt"] }> {
	get guildId(): string {
		return this.idParts[0];
	}

	get authorId(): string {
		return this.idParts[1];
	}

	get targetId(): string {
		return this.idParts[2];
	}

	get createdAt(): number {
		return Number(this.idParts[3]);
	}

	readonly reason: string;

	/** @since v3.37.0 */
	rule?: Rule;

	constructor(
		database: DatabaseStore,
		{ reason, rule, ...data }: { reason: string; rule?: Rule } & IdentifierData<Warning>,
	) {
		super(database, data, { collection: "Warnings" });

		this.reason = reason;
		this.rule = rule;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabaseStore,
		clauses?: { where?: Partial<IdentifierData<Warning>> },
	): Promise<Warning[]> {
		return await Model.all<Warning>(clientOrDatabase, {
			collection: "Warnings",
			where: Object.assign(
				{ ...clauses?.where },
				{ guildId: undefined, authorId: undefined, targetId: undefined, createdAt: undefined },
			),
		});
	}

	static async create(
		client: Client,
		data: Omit<IdentifierData<Warning>, "createdAt"> & { reason: string; rule?: Rule },
	): Promise<Warning> {
		const warningDocument = new Warning(client.database, { ...data, createdAt: Date.now().toString() });

		await warningDocument.create(client);

		return warningDocument;
	}

	static async getActiveWarnings(
		clientOrDatabase: ClientOrDatabaseStore,
		{ guildId, authorId, timeRangeMilliseconds }: { guildId: string; authorId: string, timeRangeMilliseconds: number },
	): Promise<Warning[]>;
	static async getActiveWarnings(
		clientOrDatabase: ClientOrDatabaseStore,
		{ guildId, targetId, timeRangeMilliseconds }: { guildId: string; targetId: string, timeRangeMilliseconds: number },
	): Promise<Warning[]>;
	static async getActiveWarnings(
		clientOrDatabase: ClientOrDatabaseStore,
		{ guildId, authorId, targetId, timeRangeMilliseconds }: { guildId: string; authorId?: string, targetId?: string, timeRangeMilliseconds: number },
	): Promise<Warning[]> {
		const warnings = await Warning.getAll(clientOrDatabase, { where: { guildId, authorId, targetId } });

		const now = Date.now();

		return warnings.filter((warning) => now - warning.createdAt <= timeRangeMilliseconds);
	}
}

export { Warning };
