import { ApplicationCommandOptionTypes } from 'discordeno';
import { Commands, createLocalisations } from 'logos/assets/localisations/mod.ts';
import { handleDisplayBotInformation } from 'logos/src/commands/information/commands/information/bot.ts';
import { handleDisplayGuildInformation } from 'logos/src/commands/information/commands/information/guild.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.information),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	options: [{
		...createLocalisations(Commands.information.options.bot),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleDisplayBotInformation,
	}, {
		...createLocalisations(Commands.information.options.guild),
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: handleDisplayGuildInformation,
	}],
};

export default command;
