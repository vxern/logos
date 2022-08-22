import {
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client, getLanguage } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';

const command: CommandBuilder = {
	name: 'resources',
	nameLocalizations: {
		pl: 'zasoby',
		ro: 'resurse',
	},
	description: 'Displays a list of resources to learn the language.',
	descriptionLocalizations: {
		pl: 'Wyświetla listę zasób do nauki języka.',
		ro: 'Afișează o listă cu resurse pentru învățarea limbii.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: resources,
};

/** Displays a message with information on where to find the resources for a given language. */
function resources(client: Client, interaction: Interaction): void {
	const language = getLanguage(client, interaction.guildId!);
	const repositoryLink = configuration.guilds.generateRepositoryLink(language);

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					title: 'Resources',
					description: `Click [here](${repositoryLink}) for resources.`,
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
}

export default command;
