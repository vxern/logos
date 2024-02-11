// TODO(vxern): Make the whole thing nullable.
interface Praise {
	id: string;
	authorId: string;
	targetId: string;
	comment?: string;
	createdAt: number;
}

export type { Praise };
