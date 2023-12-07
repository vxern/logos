interface Resource {
	id: string;
	guildId: string;
	authorId: string;
	answers: {
		resource: string;
	};
	isResolved: boolean;
	createdAt: number;
}

export type { Resource };
