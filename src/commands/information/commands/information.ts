import { Commands } from '../../../../assets/localisations/commands.ts';
import { createLocalisations } from '../../../../assets/localisations/types.ts';
import { ApplicationCommandOptionTypes } from '../../../../deps.ts';
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
