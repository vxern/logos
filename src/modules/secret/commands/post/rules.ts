import { EmbedPayload, Interaction } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import information, {
	InformationSection,
} from '../../data/information/information.ts';

/** Posts the rule message. */
async function postRules(
	_client: Client,
	interaction: Interaction,
): Promise<void> {
	const rawEmbeds = await Promise.all(
		Object.values(information).map<Promise<[InformationSection, EmbedPayload]>>(
			(section) => {
				return new Promise((resolve) => {
					section.generateEmbed(interaction.guild!).then((embed) => {
						resolve([section, embed]);
					});
				});
			},
		),
	);

	const embeds = rawEmbeds.map(([section, embed]) => {
		// embed.title = name.toUpperCase();
		embed.color = section.color;
		// embed.image = { url: section.image };

		return embed;
	});

	interaction.respond({ embeds: embeds });
}

export { postRules };
