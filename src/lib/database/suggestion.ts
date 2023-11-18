interface Suggestion {
	id: string;
	guildId: string;
	authorId: string;
	answers: {
		suggestion: string;
	};
	isResolved: boolean;
	createdAt: number;
}

export type { Suggestion };
