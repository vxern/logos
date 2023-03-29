import { Warning } from 'logos/src/database/structs/mod.ts';
import { Document } from 'logos/src/database/document.ts';
import configuration from 'logos/configuration.ts';

function getActiveWarnings(warnings: Map<string, Document<Warning>>): Map<string, Document<Warning>> {
	const entries = Array.from(warnings.entries());

	const now = Date.now();

	return new Map(
		entries.filter(
			([_, warning]) => (now - warning.data.createdAt) < configuration.commands.warn.within,
		),
	);
}

export { getActiveWarnings };
