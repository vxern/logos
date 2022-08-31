import {
	ApplicationCommandFlags,
	ButtonStyles,
	Interaction,
	InteractionResponseTypes,
	MessageComponentTypes,
	sendInteractionResponse,
	sendMessage,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { fromHex } from '../../../../utils.ts';
import { getChannelMention } from '../../data/information/information-sections.ts';

function postWelcome(
	client: Client,
	interaction: Interaction,
): void {
	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: 'Welcome posted.',
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);

	return void sendMessage(client.bot, interaction.channelId!, {
		embeds: [{
			title: `Welcome to **${guild.name}**`,
			description:
				`To enter the server and become its official member, read the information in the ${(getChannelMention(
					guild,
					'rules',
				))} channel to get yourself familiarised with the server guidelines, and then press the button below.`,
			color: fromHex('#f28123'),
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.Button,
				style: ButtonStyles.Secondary,
				label: 'I have read the rules, and agree to abide by them',
				customId: 'ACCEPTED_RULES',
				emoji: { name: '✅' },
			}],
		}],
	});
}

export { postWelcome };
