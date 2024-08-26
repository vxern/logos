import type { Client } from "logos/client";
import type { SuggestionDocument } from "logos/models/documents/suggestion/latest";
import { type ClientOrDatabaseStore, type CreateModelOptions, type IdentifierData, Model } from "logos/models/model";
import type { DatabaseStore } from "logos/stores/database";

type CreateSuggestionOptions = CreateModelOptions<Suggestion, SuggestionDocument, "formData">;
interface Suggestion extends SuggestionDocument {}

class Suggestion extends Model<{ collection: "Suggestions"; idParts: ["guildId", "authorId", "createdAt"] }> {
	get guildId(): string {
		return this.idParts[0];
	}

	get authorId(): string {
		return this.idParts[1];
	}

	get createdAt(): number {
		return Number(this.idParts[2]);
	}

	constructor(database: DatabaseStore, { formData, isResolved, ...data }: CreateSuggestionOptions) {
		super(database, data, { collection: "Suggestions" });

		this.formData = formData;
		this.isResolved = isResolved ?? false;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabaseStore,
		clauses?: { where?: Partial<IdentifierData<Suggestion>> },
	): Promise<Suggestion[]> {
		return await Model.all<Suggestion>(clientOrDatabase, {
			collection: "Suggestions",
			where: Object.assign(
				{ guildId: undefined, authorId: undefined, createdAt: undefined },
				{ ...clauses?.where },
			),
		});
	}

	static async create(client: Client, data: Omit<CreateSuggestionOptions, "createdAt">): Promise<Suggestion> {
		const suggestionDocument = new Suggestion(client.database, { ...data, createdAt: Date.now().toString() });
		await suggestionDocument.create(client);

		return suggestionDocument;
	}
}

export { Suggestion };
export type { CreateSuggestionOptions };
