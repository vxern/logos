import { MetadataOrIdentifierData, Model } from "./model";

interface ReportFormData {
	readonly reason: string;
	readonly users: string;
	messageLink?: string;
}

class Report extends Model<{ idParts: ["guildId", "authorId"] }> {
	get guildId(): string {
		return this._idParts[0]!;
	}

	get authorId(): string {
		return this._idParts[1]!;
	}

	// TODO(vxern): Rename this to `formData`.
	readonly answers: ReportFormData;

	isResolved: boolean;

	constructor({
		createdAt,
		answers,
		isResolved,
		...data
	}: { createdAt: number; answers: ReportFormData; isResolved: boolean } & MetadataOrIdentifierData<Report>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data
					? data["@metadata"]
					: { "@collection": "Reports", "@id": Model.buildPartialId<Report>(data) },
		});

		this.answers = answers;
		this.isResolved = isResolved;
	}
}

export { Report };
export type { ReportFormData };
