import { Warning } from 'logos/src/database/structs/users/warning.ts';
import { Document } from 'logos/src/database/structs/document.ts';
import configuration from 'logos/configuration.ts';

function getRelevantWarnings(
	warnings: Document<Warning>[],
): Document<Warning>[] {
	return warnings.filter((warning) => {
		return (Date.now() - warning.ts) <
			configuration.guilds.moderation.warnings.interval;
	});
}

export { getRelevantWarnings };
