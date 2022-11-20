import {
	ApplicationCommandFlags,
	Bot,
	ButtonStyles,
	Interaction,
	InteractionResponseTypes,
	MessageComponentTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands } from '../../../../../assets/localisations/commands.ts';
import { localise } from '../../../../../assets/localisations/types.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { defaultLanguage } from '../../../../types.ts';
import { fromHex, getChannelMention } from '../../../../utils.ts';

function postWelcome(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	sendMessage(bot, interaction.channelId!, {
		embeds: [{
			title: localise(
				Commands.post.options.welcome.strings.welcome.header,
				defaultLanguage,
			)(guild.name),
			description: localise(
				Commands.post.options.welcome.strings.welcome.body,
				defaultLanguage,
			)(getChannelMention(guild, 'rules')),
			color: fromHex('#f28123'),
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.Button,
				style: ButtonStyles.Secondary,
				label: localise(
					Commands.post.options.welcome.strings.acceptedRules,
					defaultLanguage,
				),
				customId: 'ACCEPTED_RULES',
				emoji: { name: '✅' },
			}],
		}],
	});

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(
						Commands.post.options.welcome.strings.posted,
						interaction.locale,
					),
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
}

export { postWelcome };
