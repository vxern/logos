import { Guild } from '../../../../../deps.ts';
import { getChannelMention } from './information.ts';

interface Rule {
	summary: string;
	paragraph: string;
}

interface Rules {
	[key: string]: (guild: Guild) => Promise<Rule> | Rule;
}

const rules: Rules = {
	behavior: (_) => {
		return {
			summary: 'Try to be nice.',
			paragraph: 'It is expected of members to treat each other with respect, consideration and understanding. Malicious behaviour in the form of verbal abuse, discrimination, harassment and other forms of hurtful or toxic behaviour will not be tolerated.',
		};
	},
	quality: async (guild: Guild) => {
		const memesChannel = await getChannelMention(guild, 'memes');
		return {
			summary: 'Do not be obnoxious.',
			paragraph: `It is expected of contributions made to the server to be of decent quality. Trolling, spamming, flooding, shitposting (outside of the ${memesChannel} channel) and other forms of annoying behaviour are sorely discouraged.`,
		};
	},
	relevance: (_) => {
		return {
			summary: 'Post relevant content.',
			paragraph: 'It is expected of contributions made to the server to be placed in their relevant channel and category. Contributions made in inappropriate channels for their subject will be asked to be moved to their relevant channel.',
		};
	},
	suitability: (_) => {
		return {
			summary: 'Post content that is appropriate.',
			paragraph: `It is expected of contributions made to the server to be appropriate for viewing by minors. Age-restricted (NSFW) and NSFL content is strictly prohibited. If you wouldn't show it to a minor, you shouldn't post it.`
		};
	},
	exclusivity: (_) => {
		return {
			summary: 'Do not advertise.',
			paragraph: 'It is expected of members to not advertise other Discord servers, and active attempts at advertising (including unsolicited DMs) are prohibited.',
		};
	},
};

export default rules;
