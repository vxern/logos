import { Client } from "../client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "./model";

interface SuggestionFormData {
	readonly suggestion: string;
}

// TODO(vxern): Does this not have a createdAt in the ID?
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
	}: { createdAt?: number; answers: SuggestionFormData; isResolved?: boolean } & MetadataOrIdentifierData<Suggestion>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data
					? data["@metadata"]
					: { "@collection": "Suggestions", "@id": Model.buildPartialId<Suggestion>(data) },
		});

		this.answers = answers;
		this.isResolved = isResolved ?? false;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabase,
		clauses?: { where?: Partial<IdentifierData<Suggestion>> },
	): Promise<Suggestion[]> {
		const result = await Model.all<Suggestion>(clientOrDatabase, {
			collection: "Suggestions",
			where: Object.assign({ ...clauses?.where }, { guildId: undefined, authorId: undefined }),
		});

		return result;
	}

	static async create(
		client: Client,
		data: IdentifierData<Suggestion> & { answers: SuggestionFormData },
	): Promise<Suggestion> {
		const suggestionDocument = new Suggestion(data);

		await suggestionDocument.create(client);

		return suggestionDocument;
	}
}

export { Suggestion };
export type { SuggestionFormData };
