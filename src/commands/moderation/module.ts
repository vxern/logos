import { Warning } from 'logos/src/database/structs/users/mod.ts';
import { Document } from 'logos/src/database/structs/mod.ts';
import { configuration } from 'logos/src/mod.ts';
import { cite, pardon, timeout, warn } from 'logos/src/commands/moderation/commands/mod.ts';

const commands = [cite, pardon, timeout, warn];

function getRelevantWarnings(
	warnings: Document<Warning>[],
): Document<Warning>[] {
	return warnings.filter((warning) => {
		return (Date.now() - warning.ts) <
			configuration.guilds.moderation.warnings.interval;
	});
}

export { getRelevantWarnings };
export default commands;
