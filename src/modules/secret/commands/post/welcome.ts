import {
	ButtonStyle,
	Interaction,
	MessageComponentType,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import { capitalise } from '../../../../formatting.ts';
import { fromHex } from '../../../../utils.ts';
import { getChannelMention } from '../../data/information/information.ts';

/** Posts the welcome message. */
async function postWelcome(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const language = client.getLanguage(interaction.guild!);

	interaction.respond({
		embeds: [{
			title: `Welcome to **${interaction.guild!.name!}**` +
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

export { postWelcome };
