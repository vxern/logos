import { Command } from '../../commands/structs/command.ts';
import ban from './commands/ban.ts';
import cite from './commands/cite.ts';
import kick from './commands/kick.ts';
import list from './commands/list.ts';
import pardon from './commands/pardon.ts';
import purge from './commands/purge.ts';
import reprimand from './commands/reprimand.ts';
import slowmode from './commands/slowmode.ts';

const commands: Record<string, Command> = {
	ban,
	cite,
	kick,
	list,
	pardon,
	purge,
	slowmode,
	reprimand,
};

export default commands;
