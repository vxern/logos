import { Warning } from 'logos/src/database/structs/users/warning.ts';
import { Document } from 'logos/src/database/structs/document.ts';
import configuration from 'logos/configuration.ts';

function getActiveWarnings(
	warnings: Document<Warning>[],
): Document<Warning>[] {
	return warnings.filter(
		(warning) => (Date.now() - warning.ts) < configuration.commands.warn.within,
	);
}

export { getActiveWarnings };
