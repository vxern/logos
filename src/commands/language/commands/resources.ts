import {
	ApplicationCommandFlags,
	Bot,
	ButtonStyles,
	Interaction,
	InteractionResponseTypes,
	MessageComponentTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.resources),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleDisplayResources,
	options: [show],
};

/** Displays a message with information on where to find the resources for a given language. */
function handleDisplayResources([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const locale = show ? defaultLocale : interaction.locale;
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				components: [{
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.Button,
						label: localise(Commands.resources.strings.resourcesStoredHere, locale)(guild.language),
						style: ButtonStyles.Link,
						url: constants.links.generateLanguageRepositoryLink(guild.language),
					}],
				}],
			},
		},
	);
}

export default command;
