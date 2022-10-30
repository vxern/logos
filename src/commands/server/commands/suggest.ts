import { Commands } from '../../../../assets/localisations/commands.ts';
import { createLocalisations, localise } from '../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import configuration from '../../../configuration.ts';
import { log } from '../../../controllers/logging/logging.ts';
import { mention, MentionTypes } from '../../../formatting.ts';
import { defaultLanguage } from '../../../types.ts';
import { getTextChannel, parseArguments } from '../../../utils.ts';
import { CommandBuilder } from '../../command.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.suggest),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: makeSuggestion,
	options: [{
		...createLocalisations(Commands.suggest.options.suggestion),
		type: ApplicationCommandOptionTypes.String,
		required: true,
	}],
};

async function makeSuggestion(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	const conferenceChannel = getTextChannel(
		guild,
		configuration.guilds.channels.conference,
	);
	if (!conferenceChannel) return;

	const [{ suggestion }] = parseArguments(interaction.data?.options, {});
	if (!suggestion) return;

	sendMessage(bot, conferenceChannel.id, {
		embeds: [{
			title: `🌿 ${
				localise(
					Commands.suggest.strings.suggestionReceived.header,
					defaultLanguage,
				)
			}`,
			description: localise(
				Commands.suggest.strings.suggestionReceived.body,
				defaultLanguage,
			)(mention(interaction.user.id, MentionTypes.User), suggestion),
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
					description: localise(
						Commands.suggest.strings.suggestionMade,
						interaction.locale,
					),
					color: configuration.interactions.responses.colors.green,
				}],
			},
		},
	);

	return log(
		[client, bot],
		guild,
		'suggestionSend',
		interaction.member!,
		suggestion,
	);
}

export default command;
