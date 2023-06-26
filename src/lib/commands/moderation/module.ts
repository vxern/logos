import { Warning } from 'logos/src/lib/database/structs/mod.ts';
import { Document } from 'logos/src/lib/database/document.ts';
import configuration from 'logos/src/configuration.ts';

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
