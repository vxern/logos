interface Report {
	id: string;
	guildId: string;
	authorId: string;
	answers: {
		users: string;
		reason: string;
		messageLink?: string;
	};
	isResolved: boolean;
	createdAt: number;
}

export type { Report };
