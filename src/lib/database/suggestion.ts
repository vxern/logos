import { MetadataOrIdentifierData, Model } from "./model";

interface SuggestionFormData {
	readonly suggestion: string;
}

class Suggestion extends Model<{ idParts: ["guildId", "authorId"] }> {
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
		createdAt,
		answers,
		isResolved,
		...data
	}: { createdAt: number; answers: SuggestionFormData; isResolved: boolean } & MetadataOrIdentifierData<Suggestion>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data
					? data["@metadata"]
					: { "@collection": "Suggestions", "@id": Model.buildPartialId<Suggestion>(data) },
		});

		this.answers = answers;
		this.isResolved = isResolved;
	}
}

export { Suggestion };
export type { SuggestionFormData };
