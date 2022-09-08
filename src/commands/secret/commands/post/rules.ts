import {
	ApplicationCommandFlags,
	Embed,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import informationSections from '../../data/information/information-sections.ts';

async function postRules(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	const sections = Object.values(informationSections);
	const embeds = <Embed[]> (await Promise.all(
		sections.map((section) => section.generateEmbed(client, guild)),
	)).filter((embed) => embed);

	sendMessage(
		client.bot,
		interaction.channelId!,
		{ embeds },
	);

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: 'Rules posted.',
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
}

export { postRules };
