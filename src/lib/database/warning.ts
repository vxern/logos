type Rule = "behaviour" | "quality" | "relevance" | "suitability" | "exclusivity" | "adherence";

// TODO(vxern): Make the whole thing nullable.
interface Warning {
	id: string;
	authorId: string;
	targetId: string;
	/** @since v3.37.0 */
	rule?: Rule;
	reason: string;
	createdAt: number;
}

export type { Warning, Rule };
