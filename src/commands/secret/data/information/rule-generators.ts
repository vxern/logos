import { Guild } from '../../../../../deps.ts';
import { getChannelMention } from './information.ts';

/** Represents a guild rule. */
interface Rule {
	/** The summary of the rule. */
	summary: string;

	/** The content of the rule. */
	content: string;
}

/** The defined guild rules. */
const ruleGenerators: Record<string, (guild: Guild) => Rule> = {
	behavior: (_) => ({
		summary: 'Try to be nice.',
		content:
			'It is expected of members to treat each other with respect, consideration and understanding. Malicious behaviour in the form of verbal abuse, discrimination, harassment and other forms of hurtful or toxic behaviour will not be tolerated.',
	}),
	quality: (guild: Guild) => ({
		summary: 'Do not be obnoxious.',
		content:
			`It is expected of contributions made to the server to be of decent quality. Trolling, spamming, flooding, shitposting (outside of the ${
				getChannelMention(guild, 'memes')
			} channel) and other forms of annoying behaviour are sorely discouraged.`,
	}),
	relevance: (_) => ({
		summary: 'Post relevant content.',
		content:
			'It is expected of contributions made to the server to be placed in their relevant channel and category. Contributions made in inappropriate channels for their subject will be asked to be moved to their relevant channel.',
	}),
	suitability: (_) => ({
		summary: 'Post content that is appropriate.',
		content:
			`It is expected of contributions made to the server to be appropriate for viewing by minors. Age-restricted (NSFW) and NSFL content is strictly prohibited. If you wouldn't show it to a minor, you shouldn't post it.`,
	}),
	exclusivity: (_) => ({
		summary: 'Do not advertise.',
		content:
			'It is expected of members to not advertise other Discord servers, and active attempts at advertising (including unsolicited DMs) are prohibited.',
	}),
};

export default ruleGenerators;
