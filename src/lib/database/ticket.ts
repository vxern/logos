interface Ticket {
	id: string;
	guildId: string;
	authorId: string;
	channelId: string;
	answers: {
		topic: string;
	};
	isResolved: boolean;
	createdAt: number;
}

export type { Ticket };
