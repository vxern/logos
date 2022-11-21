import { Warning } from '../../database/structs/users/mod.ts';
import { Document } from '../../database/structs/mod.ts';
import { configuration } from '../../mod.ts';
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

export { getRelevantWarnings };
export default commands;
