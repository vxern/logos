import { Warning } from 'logos/src/database/structs/mod.ts';
import { Document } from 'logos/src/database/document.ts';
import configuration from 'logos/configuration.ts';

function getActiveWarnings(warnings: Map<string, Document<Warning>>): Map<string, Document<Warning>> {
	return new Map(
		Array.from(warnings.entries()).filter(
			([_referenceId, warning]) => (Date.now() - warning.ts) < configuration.commands.warn.within,
		),
	);
}

export { getActiveWarnings };
