import { MetadataOrIdentifierData, Model } from "./model";

// TODO(vxern): This needs a guild in the ID as well.
class Praise extends Model<{ idParts: ["authorId", "targetId"] }> {
	get authorId(): string {
		return this._idParts[0]!;
	}

	get targetId(): string {
		return this._idParts[1]!;
	}

	comment?: string;

	constructor({
		createdAt,
		comment,
		...data
	}: { createdAt: number; comment: string } & MetadataOrIdentifierData<Praise>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data
					? data["@metadata"]
					: { "@collection": "Praises", "@id": Model.buildPartialId<Praise>(data) },
		});

		this.comment = comment;
	}
}

export { Praise };
