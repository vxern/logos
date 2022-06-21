import { Command } from '../../commands/structs/command.ts';
import compare from './commands/compare.ts';
import post from './commands/post.ts';

const commands: Record<string, Command> = {
	compare,
	post,
};

export default commands;
