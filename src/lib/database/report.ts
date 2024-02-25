import { Client } from "../client";
import { ClientOrDatabase, IdentifierData, MetadataOrIdentifierData, Model } from "./model";

interface ReportFormData {
	readonly reason: string;
	readonly users: string;
	messageLink?: string;
}

// TODO(vxern): Does this not have a createdAt in the ID?
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
	}: { createdAt?: number; answers: ReportFormData; isResolved?: boolean } & MetadataOrIdentifierData<Report>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data
					? data["@metadata"]
					: { "@collection": "Reports", "@id": Model.buildId<Report>(data, { collection: "Reports" }) },
		});

		this.answers = answers;
		this.isResolved = isResolved ?? false;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabase,
		clauses?: { where?: Partial<IdentifierData<Report>> },
	): Promise<Report[]> {
		const result = await Model.all<Report>(clientOrDatabase, {
			collection: "Reports",
			where: Object.assign({ ...clauses?.where }, { guildId: undefined, authorId: undefined }),
		});

		return result;
	}

	static async create(client: Client, data: IdentifierData<Report> & { answers: ReportFormData }): Promise<Report> {
		const reportDocument = new Report(data);

		await reportDocument.create(client);

		return reportDocument;
	}
}

export { Report };
export type { ReportFormData };
