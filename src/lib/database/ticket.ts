import { Model } from "./model";

type TicketType = "standalone" | "inquiry";

interface TicketFormData {
	readonly topic: string;
}

class Ticket extends Model<{ idParts: [guildId: string, authorId: string, channelId: string] }> {
	static readonly collection = "Tickets";

	get guildId(): string {
		return this._idParts[0]!;
	}

	get authorId(): string {
		return this._idParts[1]!;
	}

	get channelId(): string {
		return this._idParts[2]!;
	}

	readonly type: TicketType;
	// TODO(vxern): Rename this to `formData`.
	readonly answers: TicketFormData;

	isResolved: boolean;

	constructor({
		id,
		createdAt,
		type,
		answers,
		isResolved,
	}: { id: string; createdAt: number; type: TicketType; answers: TicketFormData; isResolved: boolean }) {
		super({ id, createdAt });

		this.type = type;
		this.answers = answers;
		this.isResolved = isResolved;
	}
}

export { Ticket };
export type { TicketType };
