import { Model } from "./model";

type Rule = "behaviour" | "quality" | "relevance" | "suitability" | "exclusivity" | "adherence";

// TODO(vxern): This needs a guild in the ID as well.
class Warning extends Model<{ idParts: [authorId: string, targetId: string] }> {
	static readonly collection = "Warnings";

	get authorId(): string {
		return this._idParts[0]!;
	}

	get targetId(): string {
		return this._idParts[1]!;
	}

	readonly reason: string;

	/** @since v3.37.0 */
	rule?: Rule;

	constructor({ id, createdAt, reason, rule }: { id: string; createdAt: number; reason: string; rule?: Rule }) {
		super({ id, createdAt });

		this.reason = reason;
		this.rule = rule;
	}
}

export { Warning };
export type { Rule };
