import { MetadataOrIdentifierData, Model } from "./model";

type Rule = "behaviour" | "quality" | "relevance" | "suitability" | "exclusivity" | "adherence";

// TODO(vxern): This needs a guild in the ID as well.
class Warning extends Model<{ idParts: ["authorId", "targetId"] }> {
	get authorId(): string {
		return this._idParts[0]!;
	}

	get targetId(): string {
		return this._idParts[1]!;
	}

	readonly reason: string;

	/** @since v3.37.0 */
	rule?: Rule;

	constructor({
		createdAt,
		reason,
		rule,
		...data
	}: { createdAt: number; reason: string; rule?: Rule } & MetadataOrIdentifierData<Warning>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data
					? data["@metadata"]
					: { "@collection": "Warnings", "@id": Model.buildPartialId<Warning>(data) },
		});

		this.reason = reason;
		this.rule = rule;
	}
}

export { Warning };
export type { Rule };
