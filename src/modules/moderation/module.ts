import configuration from '../../configuration.ts';
import { Document } from '../../database/structs/document.ts';
import { Warning } from '../../database/structs/users/warning.ts';
import cite from './commands/cite.ts';
import list from './commands/list.ts';
import timeout from './commands/timeout.ts';
import unwarn from './commands/unwarn.ts';
import warn from './commands/warn.ts';

const commands = [cite, list, timeout, unwarn, warn];

function getRelevantWarnings(
	warnings: Document<Warning>[],
): Document<Warning>[] {
	return warnings.filter((warning) =>
		(Date.now() - warning.ts) * 1000 <
			configuration.guilds.moderation.warnings.interval
	);
}

export default commands;
export { getRelevantWarnings };
