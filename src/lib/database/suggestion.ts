import { Model } from "./model";

interface SuggestionFormData {
	readonly suggestion: string;
}

class Suggestion extends Model<{ idParts: [guildId: string, authorId: string] }> {
	static readonly collection = "Suggestions";

	get guildId(): string {
		return this._idParts[0]!;
	}

	get authorId(): string {
		return this._idParts[1]!;
	}

	// TODO(vxern): Rename this to `formData`.
	readonly answers: SuggestionFormData;

	isResolved: boolean;

	constructor({
		id,
		createdAt,
		answers,
		isResolved,
	}: { id: string; createdAt: number; answers: SuggestionFormData; isResolved: boolean }) {
		super({ id, createdAt });

		this.answers = answers;
		this.isResolved = isResolved;
	}
}

export { Suggestion };
