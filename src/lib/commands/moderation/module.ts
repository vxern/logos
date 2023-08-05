import { Document } from "../../database/document";
import { Warning } from "../../database/structs/warning";

function getActiveWarnings(
	warnings: Map<string, Document<Warning>>,
	expirationMilliseconds: number,
): Map<string, Document<Warning>> {
	const entries = Array.from(warnings.entries());

	const now = Date.now();

	return new Map(entries.filter(([_, warning]) => now - warning.data.createdAt < expirationMilliseconds));
}

export { getActiveWarnings };
