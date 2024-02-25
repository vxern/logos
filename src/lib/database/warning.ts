import { Client } from "../client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "./model";

type Rule = "behaviour" | "quality" | "relevance" | "suitability" | "exclusivity" | "adherence";

// TODO(vxern): This needs a guild in the ID as well.
// TODO(vxern): Does this not have a createdAt in the ID?
class Warning extends Model<{ idParts: ["authorId", "targetId"] }> {
	get authorId(): string {
		return this.idParts[0]!;
	}

	get targetId(): string {
		return this.idParts[1]!;
	}

	readonly reason: string;

	/** @since v3.37.0 */
	rule?: Rule;

	constructor({
		createdAt,
		reason,
		rule,
		...data
	}: { createdAt?: number; reason: string; rule?: Rule } & MetadataOrIdentifierData<Warning>) {
		super({
			createdAt,
			"@metadata": Model.buildMetadata(data, { collection: "Warnings" }),
		});

		this.reason = reason;
		this.rule = rule;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabase,
		clauses?: { where?: Partial<IdentifierData<Warning>> },
	): Promise<Warning[]> {
		const result = await Model.all<Warning>(clientOrDatabase, {
			collection: "Warnings",
			where: Object.assign({ ...clauses?.where }, { authorId: undefined, targetId: undefined }),
		});

		return result;
	}

	static async create(
		client: Client,
		data: IdentifierData<Warning> & { reason: string; rule?: Rule },
	): Promise<Warning> {
		const warningDocument = new Warning(data);

		await warningDocument.create(client);

		return warningDocument;
	}
}

export { Warning };
export type { Rule };
