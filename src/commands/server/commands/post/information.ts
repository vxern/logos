import {
	ApplicationCommandFlags,
	Bot,
	Embed,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, localise } from '../../../../../assets/localisations/mod.ts';
import { Client, configuration } from '../../../../mod.ts';
import { informationSections } from '../../data/information/mod.ts';

async function postInformation(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	const sections = Object.values(informationSections);
	const embeds = <Embed[]> (
		await Promise.all(
			sections.map((section) => section.generateEmbed([client, bot], guild)),
		)
	).filter((embed) => embed);

	sendMessage(
		bot,
		interaction.channelId!,
		{ embeds },
	);

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
						Commands.post.options.information.strings.posted,
						interaction.locale,
					),
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
}

export { postInformation };
