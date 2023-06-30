import configuration from "../../../configuration.js";
import { Document } from "../../database/document.js";
import { Warning } from "../../database/structs/warning.js";

function getActiveWarnings(warnings: Map<string, Document<Warning>>): Map<string, Document<Warning>> {
	const entries = Array.from(warnings.entries());

	const now = Date.now();

	return new Map(entries.filter(([_, warning]) => now - warning.data.createdAt < configuration.commands.warn.within));
}

export { getActiveWarnings };
