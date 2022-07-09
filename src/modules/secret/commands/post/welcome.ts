import {
	ButtonStyle,
	Interaction,
	MessageComponentType,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import { fromHex } from '../../../../utils.ts';
import { getChannelMention } from '../../data/information/information.ts';

/** Posts the welcome message. */
async function postWelcome(
	_client: Client,
	interaction: Interaction,
): Promise<void> {
	interaction.respond({
		embeds: [{
			title: `Welcome to **${interaction.guild!.name!}**`,
			description:
				`To enter the server and become its official member, read the information in the ${(await getChannelMention(
					interaction.guild!,
					'rules',
				))} channel to get yourself familiarised with the server guidelines, and then press the button below.`,
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
				emoji: { name: '✅' },
			}],
		}],
	});
}

export { postWelcome };
