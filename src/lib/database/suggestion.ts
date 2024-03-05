import { Client } from "../client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "./model";

interface SuggestionFormData {
	readonly suggestion: string;
}

class Suggestion extends Model<{ idParts: ["guildId", "authorId", "createdAt"] }> {
	get guildId(): string {
		return this.idParts[0];
	}

	get authorId(): string {
		return this.idParts[1];
	}

	get createdAt(): number {
		return Number(this.idParts[2]);
	}

	// TODO(vxern): Rename this to `formData`.
	readonly answers: SuggestionFormData;

	isResolved: boolean;

	constructor({
		answers,
		isResolved,
		...data
	}: { answers: SuggestionFormData; isResolved?: boolean } & MetadataOrIdentifierData<Suggestion>) {
		super({
			"@metadata": Model.buildMetadata(data, { collection: "Suggestions" }),
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
			where: Object.assign({ ...clauses?.where }, { guildId: undefined, authorId: undefined, createdAt: undefined }),
		});

		return result;
	}

	static async create(
		client: Client,
		data: Omit<IdentifierData<Suggestion>, "createdAt"> & { answers: SuggestionFormData },
	): Promise<Suggestion> {
		const suggestionDocument = new Suggestion({ ...data, createdAt: Date.now().toString() });

		await suggestionDocument.create(client);

		return suggestionDocument;
	}
}

export { Suggestion };
export type { SuggestionFormData };
