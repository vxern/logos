import configuration from '../../configuration.ts';
import { Document } from '../../database/structs/document.ts';
import { Warning } from '../../database/structs/users/warning.ts';
import cite from './commands/cite.ts';
import list from './commands/list.ts';
import pardon from './commands/pardon.ts';
import timeout from './commands/timeout.ts';
import warn from './commands/warn.ts';

const commands = [cite, list, pardon, timeout, warn];

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
