import { Guild } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import { getChannelMention } from './information.ts';

interface CategorySections {
	[key: string]: (client: Client, guild: Guild) => Promise<string>;
}

const categories: CategorySections = {
	information: async (_, guild) => {
		const mentions = await getChannelMentions(guild, [
			'rules',
			'announcements',
			'introductions',
		]);
		return `Meta channels which provide information about the server itself as well as its members. The server's ${
			mentions[0]
		}, ${mentions[1]} and member ${mentions[2]} are found here.`;
	},
	discussion: async (client, guild) => {
		const language = client.getLanguage(guild);
		if (!language) {
			return 'This description generator requires an established language.';
		}
		const mentions = await getChannelMentions(guild, [
			'discussion',
			language,
			'other-languages',
		]);
		return `Core discussion channels for language-related conversations and debates in English (${
			mentions[0]
		}), ${mentions[1]} or in ${mentions[2]}.`;
	},
	education: async (_, guild) => {
		const mentions = await getChannelMentions(guild, [
			'resources',
			'classroom',
		]);
		return `Channels dedicated to the teaching of the language. The ${
			mentions[0]
		} and the ${mentions[1]} channels are contained here.`;
	},
	miscellaneous: async (_, guild) => {
		const mentions = await getChannelMentions(guild, [
			'off topic',
			'music',
			'memes',
		]);

		return `Topics that do not concern the teaching of the language, but ones that members may enjoy speaking about and sharing, such as ${
			mentions[0]
		} discussions, ${mentions[1]} and ${mentions[2]}.`;
	},
};

async function getChannelMentions(
	guild: Guild,
	channelNames: string[],
): Promise<string[]> {
	const mentionsGenerators = channelNames.map((channel) =>
		getChannelMention(guild, channel)
	);
	const mentions = await Promise.all(mentionsGenerators);
	return mentions;
}

export default categories;
