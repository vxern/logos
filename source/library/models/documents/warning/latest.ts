import type { Rule } from "logos:constants/rules";

interface WarningDocument {
	reason: string;
	rule?: Rule;
}

export type { WarningDocument };
