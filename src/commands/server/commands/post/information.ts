import {
	ApplicationCommandFlags,
	Bot,
	Embed,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import informationSections from 'logos/src/commands/server/data/information/information-sections.ts';
import { Client } from 'logos/src/client.ts';
import configuration from 'logos/configuration.ts';

async function handlePostInformationMessage(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const sections = Object.values(informationSections);
	const embeds = <Embed[]> (
		await Promise.all(
			sections.map((section) => section.generateEmbed([client, bot], guild)),
		)
	).filter((embed) => embed !== undefined);

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

export { handlePostInformationMessage };
