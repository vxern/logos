// TODO(vxern): Make the whole thing nullable.
interface Ticket {
	id: string;
	guildId: string;
	authorId: string;
	channelId: string;
	answers: {
		topic: string;
	};
	type: TicketType;
	isResolved: boolean;
	createdAt: number;
}

type TicketType = "standalone" | "inquiry";

export type { Ticket, TicketType };
