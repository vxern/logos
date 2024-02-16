import { MetadataOrIdentifierData, Model } from "./model";

interface ResourceFormData {
	readonly resource: string;
}

class Resource extends Model<{ idParts: ["guildId", "authorId"] }> {
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
		createdAt,
		answers,
		isResolved,
		...data
	}: { createdAt: number; answers: ResourceFormData; isResolved: boolean } & MetadataOrIdentifierData<Resource>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data
					? data["@metadata"]
					: { "@collection": "Resources", "@id": Model.buildPartialId<Resource>(data) },
		});

		this.answers = answers;
		this.isResolved = isResolved;
	}
}

export { Resource };
export type { ResourceFormData };
