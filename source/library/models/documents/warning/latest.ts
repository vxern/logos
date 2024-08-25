import type { Rule } from "logos:constants/rules.ts";

interface WarningDocument {
	reason: string;
	rule?: Rule;
}

export type { WarningDocument };
