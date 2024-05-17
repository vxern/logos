import type { Client } from "logos/client";
import { type ClientOrDatabaseStore, type IdentifierData, Model } from "logos/database/model";
import type { DatabaseStore } from "logos/stores/database";

interface ReportFormData {
	readonly reason: string;
	readonly users: string;
	messageLink?: string;
}

type CreateReportOptions = { formData: ReportFormData; isResolved?: boolean } & IdentifierData<Report>;

class Report extends Model<{ collection: "Reports"; idParts: ["guildId", "authorId", "createdAt"] }> {
	get guildId(): string {
		return this.idParts[0];
	}

	get authorId(): string {
		return this.idParts[1];
	}

	get createdAt(): number {
		return Number(this.idParts[2]);
	}

	readonly formData: ReportFormData;

	isResolved: boolean;

	constructor(database: DatabaseStore, { formData, isResolved, ...data }: CreateReportOptions) {
		super(database, data, { collection: "Reports" });

		this.formData = formData;
		this.isResolved = isResolved ?? false;
	}

	static async getAll(
		clientOrDatabase: ClientOrDatabaseStore,
		clauses?: { where?: Partial<IdentifierData<Report>> },
	): Promise<Report[]> {
		return await Model.all<Report>(clientOrDatabase, {
			collection: "Reports",
			where: Object.assign(
				{ guildId: undefined, authorId: undefined, createdAt: undefined },
				{ ...clauses?.where },
			),
		});
	}

	static async create(client: Client, data: Omit<CreateReportOptions, "createdAt">): Promise<Report> {
		const reportDocument = new Report(client.database, { ...data, createdAt: Date.now().toString() });

		await reportDocument.create(client);

		return reportDocument;
	}
}

export { Report };
export type { CreateReportOptions, ReportFormData };
