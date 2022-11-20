import configuration from '../../configuration.ts';
import { Document } from '../../database/structs/document.ts';
import { Warning } from '../../database/structs/users/warning.ts';
import { cite, pardon, timeout, warn } from './commands/mod.ts';

const commands = [cite, pardon, timeout, warn];

function getRelevantWarnings(
	warnings: Document<Warning>[],
): Document<Warning>[] {
	return warnings.filter((warning) => {
		return (Date.now() - warning.ts) <
			configuration.guilds.moderation.warnings.interval;
	});
}

export default commands;
export { getRelevantWarnings };
