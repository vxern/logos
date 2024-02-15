import { Model } from "./model";

// TODO(vxern): This needs a guild in the ID as well.
class Praise extends Model<{ idParts: [authorId: string, targetId: string] }> {
	static readonly collection = "Praises";

	get authorId(): string {
		return this._idParts[0]!;
	}

	get targetId(): string {
		return this._idParts[1]!;
	}

	comment?: string;

	constructor({ id, createdAt, comment }: { id: string; createdAt: number; comment: string }) {
		super({ id, createdAt });

		this.comment = comment;
	}
}

export { Praise };
