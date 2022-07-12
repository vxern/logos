import { Command } from '../../commands/structs/command.ts';
import profile from './commands/profile.ts';

const commands: Record<string, Command> = {
	profile,
};

export default commands;
