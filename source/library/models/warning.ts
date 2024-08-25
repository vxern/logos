import type { Client } from "logos/client";
import { type ClientOrDatabaseStore, type CreateModelOptions, type IdentifierData, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";
import type { WarningDocument } from "logos/models/documents/warning/latest";

type CreateWarningOptions = CreateModelOptions<Warning, WarningDocument, "reason" | "rule">;
interface Warning extends WarningDocument {}

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

	constructor(database: DatabaseStore, { reason, rule, ...data }: CreateWarningOptions) {
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
				{ guildId: undefined, authorId: undefined, targetId: undefined, createdAt: undefined },
				{ ...clauses?.where },
			),
		});
	}

	static async create(client: Client, data: Omit<CreateWarningOptions, "createdAt">): Promise<Warning> {
		const warningDocument = new Warning(client.database, { ...data, createdAt: Date.now().toString() });

		await warningDocument.create(client);

		return warningDocument;
	}

	static async getActiveWarnings(
		clientOrDatabase: ClientOrDatabaseStore,
		{
			guildId,
			authorId,
			timeRangeMilliseconds,
		}: { guildId: string; authorId: string; timeRangeMilliseconds: number },
	): Promise<Warning[]>;
	static async getActiveWarnings(
		clientOrDatabase: ClientOrDatabaseStore,
		{
			guildId,
			targetId,
			timeRangeMilliseconds,
		}: { guildId: string; targetId: string; timeRangeMilliseconds: number },
	): Promise<Warning[]>;
	static async getActiveWarnings(
		clientOrDatabase: ClientOrDatabaseStore,
		{
			guildId,
			authorId,
			targetId,
			timeRangeMilliseconds,
		}: { guildId: string; authorId?: string; targetId?: string; timeRangeMilliseconds: number },
	): Promise<Warning[]> {
		const warnings = await Warning.getAll(clientOrDatabase, { where: { guildId, authorId, targetId } });

		const now = Date.now();

		return warnings.filter((warning) => now - warning.createdAt <= timeRangeMilliseconds);
	}
}

export { Warning };
export type { CreateWarningOptions };
