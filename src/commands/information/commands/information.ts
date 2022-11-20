import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from '../../../../assets/localisations/mod.ts';
import { CommandBuilder } from '../../command.ts';
import { displayBotInformation } from './information/bot.ts';
import { displayGuildInformation } from './information/guild.ts';

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
