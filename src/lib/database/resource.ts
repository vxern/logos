import { Model } from "./model";

interface ResourceFormData {
	readonly reason: string;
	readonly aim: string;
	readonly whereFound: string;
}

class Resource extends Model<{ idParts: [guildId: string, authorId: string] }> {
	static readonly collection = "Resources";

	get guildId(): string {
		return this._idParts[0]!;
	}

	get authorId(): string {
		return this._idParts[1]!;
	}

	// TODO(vxern): Rename this to `formData`.
	readonly answers: ResourceFormData;

	isResolved: boolean;

	constructor({
		id,
		createdAt,
		answers,
		isResolved,
	}: { id: string; createdAt: number; answers: ResourceFormData; isResolved: boolean }) {
		super({ id, createdAt });

		this.answers = answers;
		this.isResolved = isResolved;
	}
}

export { Resource };
