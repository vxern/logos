import { CommandBuilder } from '../commands/command.ts';
import information from './information/module.ts';
import language from './language/module.ts';
import moderation from './moderation/module.ts';
//import music from './music/module.ts';
import secret from './secret/module.ts';
import social from './social/module.ts';

const modules = [
	information,
	language,
	moderation,
	//music,
	secret,
	social,
];

const commandBuilders = modules.reduce<CommandBuilder[]>(
	(commandBuilders, module) => {
		commandBuilders.push(...module);
		return commandBuilders;
	},
	[],
);

export { commandBuilders };
