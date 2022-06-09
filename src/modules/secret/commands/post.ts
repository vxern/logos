import {
	ButtonStyle,
	EmbedPayload,
	Interaction,
	MessageComponentType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';
import { OptionType } from '../../../commands/option.ts';
import { bold, capitalise } from '../../../formatting.ts';
import { fromHex } from '../../../utils.ts';
import information, {
	getChannelMention,
	Section,
} from '../data/information/information.ts';

const command: Command = {
	name: 'post',
	availability: Availability.OWNER,
	options: [{
		name: 'rules',
		type: OptionType.SUB_COMMAND,
		handle: rules,
	}, {
		name: 'welcome',
		type: OptionType.SUB_COMMAND,
		handle: welcome,
	}],
};

async function rules(_: Client, interaction: Interaction): Promise<void> {
	const rawEmbeds = await Promise.all(
		Object.values(information).map<Promise<[Section, EmbedPayload]>>(
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

	interaction.respond({
		embeds: embeds,
	});
}

async function welcome(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const language = client.getLanguage(interaction.guild!);

	interaction.respond({
		embeds: [{
			title: `Welcome to ${bold(interaction.guild!.name!)}` +
				(language
					? ` - The largest Discord server dedicated to teaching and learning the ${
						capitalise(language!)
					} language.`
					: '.'),
			description:
				`To enter the server and become its official member, read the information contained within ${(await getChannelMention(
					interaction.guild!,
					'rules',
				))} to get yourself familiarised with what you should expect from the server, and press 'I have read the rules' below.`,
			color: fromHex('#f28123'),
			/* image: {
        url: "https://i.imgur.com/nxcnx7j.png",
      },*/
		}],
		components: [{
			type: MessageComponentType.ActionRow,
			components: [{
				type: MessageComponentType.BUTTON,
				style: ButtonStyle.GREY,
				label: 'I have read the rules, and agree to abide by them',
				customID: 'ACCEPTED_RULES',
				emoji: {
					name: '✅',
				},
			}],
		}],
	});
}

export default command;
