import { EmbedPayload, Interaction } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import information, {
	InformationSection,
} from '../../data/information/information.ts';

/** Posts the rule message. */
async function postRules(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const rawEmbedsWithUndefined = await Promise.all(
		Object.values(information).map(
			(section) => section.generateEmbed(client, interaction.guild!)?.then((embed) => !embed ? undefined : [section, embed])
		),
	);
  
  const rawEmbeds = <[InformationSection, EmbedPayload][]> rawEmbedsWithUndefined.filter((embed) => embed);

	const embeds = rawEmbeds.map(([section, embed]) => {
		// embed.title = name.toUpperCase();
		embed.color = section.color;
		// embed.image = { url: section.image };

		return embed;
	});

	interaction.respond({ embeds: embeds });
}

export { postRules };
