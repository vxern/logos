import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { log } from 'logos/src/controllers/logging/logging.ts';
import { Client } from 'logos/src/client.ts';
import { getTextChannel, parseArguments } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLanguage } from 'logos/types.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.suggest),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleMakeSuggestion,
	options: [{
		...createLocalisations(Commands.suggest.options.suggestion),
		type: ApplicationCommandOptionTypes.String,
		required: true,
	}],
};

function handleMakeSuggestion(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const conferenceChannel = getTextChannel(guild, configuration.guilds.channels.conference);
	if (conferenceChannel === undefined) return;

	const [{ suggestion }] = parseArguments(interaction.data?.options, {});
	if (suggestion === undefined) return;

	const suggestionReceived = localise(Commands.suggest.strings.suggestionReceived.header, defaultLanguage);

	sendMessage(bot, conferenceChannel.id, {
		embeds: [{
			title: `🌿 ${suggestionReceived}`,
			description: localise(Commands.suggest.strings.suggestionReceived.body, defaultLanguage)(
				mention(interaction.user.id, MentionTypes.User),
				suggestion,
			),
			color: configuration.interactions.responses.colors.darkGreen,
		}],
	});

	sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(Commands.suggest.strings.suggestionMade, interaction.locale),
					color: configuration.interactions.responses.colors.green,
				}],
			},
		},
	);

	return log([client, bot], guild, 'suggestionSend', interaction.member!, suggestion);
}

export default command;
