import { Model } from "./model";

interface ReportFormData {
	readonly reason: string;
	readonly aim: string;
	readonly whereFound: string;
}

class Report extends Model<{ idParts: [guildId: string, authorId: string] }> {
	static readonly collection = "Reports";

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
		id,
		createdAt,
		answers,
		isResolved,
	}: { id: string; createdAt: number; answers: ReportFormData; isResolved: boolean }) {
		super({ id, createdAt });

		this.answers = answers;
		this.isResolved = isResolved;
	}
}

export { Report };
