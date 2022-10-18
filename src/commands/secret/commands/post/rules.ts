import { Commands } from "../../../../../assets/localisations/commands.ts";
import { localise } from "../../../../../assets/localisations/types.ts";
import {
	ApplicationCommandFlags,
	Bot,
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
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	const sections = Object.values(informationSections);
	const embeds = <Embed[]> (await Promise.all(
		sections.map((section) => section.generateEmbed([client, bot], guild)),
	)).filter((embed) => embed);

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
					description: localise(Commands.post.options.rules.strings.posted, interaction.locale),
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
}

export { postRules };
