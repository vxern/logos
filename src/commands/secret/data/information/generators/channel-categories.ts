import { Guild } from '../../../../../../deps.ts';
import { Client, getLanguage } from '../../../../../client.ts';
import { getChannelMention } from './../information-sections.ts';

/** The information for channel categories for the guilds. */
const channelCategoryGenerators: Record<
	string,
	(client: Client, guild: Guild) => string
> = {
	information: (_client, guild) => {
		const mentions = getChannelMentions(guild, [
			'rules',
			'announcements',
			'introductions',
		]);

		return `Meta channels that provide information about the server itself, as well as its members. The server's ${mentions.shift()}, ${mentions.shift()} and member ${mentions.shift()} are found here.`;
	},
	discussion: (client, guild) => {
		const language = getLanguage(client, guild.id);

		const mentions = getChannelMentions(guild, [
			'discussion',
			language,
			'other languages',
		]);

		return `Core discussion channels for language-related conversations and debates in English (${mentions.shift()}), ${mentions.shift()} or in ${mentions.shift()}.`;
	},
	education: (_client, guild) => {
		const mentions = getChannelMentions(guild, [
			'daily phrase',
			'classroom',
		]);

		return `Channels dedicated to the teaching of the language. The ${mentions.shift()} and the ${mentions.shift()} channels are contained here.`;
	},
	miscellaneous: (_client, guild) => {
		const mentions = getChannelMentions(guild, [
			'off topic',
			'programming',
			'music',
		]);

		return `Topics that do not concern the teaching of the language, but ones that members may enjoy speaking about and sharing, such as ${mentions.shift()} discussions, ${mentions.shift()} and ${mentions.shift()}.`;
	},
};

/** A utility method for getting mentions for multiple guild channels. */
function getChannelMentions(
	guild: Guild,
	channelNames: string[],
): string[] {
	return channelNames.map((channel) => getChannelMention(guild, channel));
}

export default channelCategoryGenerators;
