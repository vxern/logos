import { Guild } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import { getChannelMention } from './information.ts';

/** Represents generators for explanations of channel categories. */
interface ChannelCategories {
	[key: string]: (client: Client, guild: Guild) => Promise<string>;
}

/** The information for channel categories for the guilds. */
const categories: ChannelCategories = {
	information: async (_client, guild) => {
		const mentions = await getChannelMentions(guild, [
			'rules',
			'announcements',
			'introductions',
		]);

		return `Meta channels that provide information about the server itself, as well as its members. The server's ${
			mentions[0]
		}, ${mentions[1]} and member ${mentions[2]} are found here.`;
	},
	discussion: async (client, guild) => {
		const language = client.getLanguage(guild);
		const mentions = await getChannelMentions(guild, [
			'discussion',
			language,
			'other languages',
		]);

		return `Core discussion channels for language-related conversations and debates in English (${
			mentions[0]
		}), ${mentions[1]} or in ${mentions[2]}.`;
	},
	education: async (_client, guild) => {
		const mentions = await getChannelMentions(guild, [
			'daily phrase',
			'classroom',
		]);

		return `Channels dedicated to the teaching of the language. The ${
			mentions[0]
		} and the ${mentions[1]} channels are contained here.`;
	},
	miscellaneous: async (_client, guild) => {
		const mentions = await getChannelMentions(guild, [
			'off topic',
			'programming',
			'music',
		]);

		return `Topics that do not concern the teaching of the language, but ones that members may enjoy speaking about and sharing, such as ${
			mentions[0]
		} discussions, ${mentions[1]} and ${mentions[2]}.`;
	},
};

/** A utility method for getting mentions for multiple guild channels. */
function getChannelMentions(
	guild: Guild,
	channelNames: string[],
): Promise<string[]> {
	return Promise.all(
		channelNames.map((channel) => getChannelMention(guild, channel)),
	);
}

export default categories;
