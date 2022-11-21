import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/mod.ts';
import {
	displayBotInformation,
	displayGuildInformation,
} from 'logos/src/commands/information/commands/information/mod.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.information),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [{
		...createLocalisations(Commands.information.options.bot),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: displayBotInformation,
	}, {
		...createLocalisations(Commands.information.options.guild),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: displayGuildInformation,
	}],
};

export default command;
