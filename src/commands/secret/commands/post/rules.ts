import {
	Embed,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import informationSections, {
	InformationSection,
} from '../../data/information/information-sections.ts';

function postRules(
	client: Client,
	interaction: Interaction,
): void {
	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	const sections = Object.values(informationSections);

	const sectionEmbedTuples = <[InformationSection, Embed][]> sections
		.map<[InformationSection, Embed | undefined]>((
			section,
		) => [section, section.generateEmbed(client, guild)])
		.filter(([_section, embed]) => embed);

	const embeds = sectionEmbedTuples.map(([section, embed]) => {
		// embed.title = name.toUpperCase();
		embed.color = section.color;
		// embed.image = { url: section.image };

		return embed;
	});

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: { embeds },
		},
	);
}

export { postRules };
