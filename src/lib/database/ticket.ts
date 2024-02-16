import { MetadataOrIdentifierData, Model } from "./model";

type TicketType = "standalone" | "inquiry";

interface TicketFormData {
	readonly topic: string;
}

class Ticket extends Model<{ idParts: ["guildId", "authorId", "channelId"] }> {
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
		createdAt,
		type,
		answers,
		isResolved,
		...data
	}: {
		createdAt: number;
		type: TicketType;
		answers: TicketFormData;
		isResolved: boolean;
	} & MetadataOrIdentifierData<Ticket>) {
		super({
			createdAt,
			"@metadata":
				"@metadata" in data
					? data["@metadata"]
					: { "@collection": "Tickets", "@id": Model.buildPartialId<Ticket>(data) },
		});

		this.type = type;
		this.answers = answers;
		this.isResolved = isResolved;
	}
}

export { Ticket };
export type { TicketType, TicketFormData };
