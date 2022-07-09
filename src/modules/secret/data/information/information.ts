import { EmbedPayload, Guild } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { mention } from '../../../../formatting.ts';
import { findChannelByName, fromHex, getInvite } from '../../../../utils.ts';
// import categories from './channel-categories.ts';
import rules from './rules.ts';

/** Represents a section of guild information. */
interface InformationSection {
	/** The image associated with the section. */
	image: string;

	/** The embed ribbon colour for the section. */
	color: number;

	/** The method to generate the embed payload. */
	generateEmbed: (client: Client, guild: Guild) => Promise<EmbedPayload>;
}

/** Represents the sections of information for guilds. */
interface InformationSections {
	[key: string]: InformationSection;
}

/** The defined sections of information for guilds. */
const information: InformationSections = {
	rules: {
		image: 'https://i.imgur.com/wRBpXcY.png',
		color: fromHex('#ff9a76'),
		generateEmbed: async (_client, guild) => {
			const fields = [];

			for (const [title, generateRule] of Object.entries(rules)) {
				// deno-lint-ignore no-await-in-loop
				const rule = await generateRule(guild);
				fields.push({
					name: `💠  **${title.toUpperCase()}**  ~  TLDR: *${rule.summary}*`,
					value: rule.content,
					inline: false,
				});
			}

			const guildRoles = await guild.roles.array();
			const moderatorRole = guildRoles.find((role) =>
				role.name === configuration.guilds.moderation.enforcer
			)!;

			fields.push({
				name: 'ℹ️  MODERATION POLICY',
				value:
					`The server abides by a 3-warn moderation policy, enforced by the server's ${
						mention(moderatorRole.id, 'ROLE')
					}s. The above rules apply to the entirety of the server, and a breach thereof will cause a warning to be issued.\n\nDepending on the circumstances, a timeout may be issued to the member for the duration of 5, 15, or 60 minutes respectively.\n\nIf a member received three warnings, and a situation occurs where a fourth warning would be issued, the member will be kicked instead.\n\nFor members who show no regard for the server rules, and are not interested in making useful contributions, a permanent ban may be issued.`,
				inline: false,
			});

			return {
				description: '*Last updated: 9th July 2022*',
				fields: fields,
			};
		},
	},
	/*
	categories: {
		image: 'https://i.imgur.com/NRTrDdO.png',
		color: fromHex('#679B9B'),
		generateEmbed: async (client, guild) => {
			const fields = [];
			for (
				const [title, generateCategoryDescription] of Object.entries(categories)
			) {
				fields.push({
					name: `${bold(title.toUpperCase())}`,
					// deno-lint-ignore no-await-in-loop
					value: await generateCategoryDescription(client, guild),
					inline: false,
				});
			}

			return { fields: fields };
		},
	},
  */
	invite: {
		image: 'https://i.imgur.com/snJaKYm.png',
		color: fromHex('#637373'),
		generateEmbed: async (_client, guild) => ({
			fields: [{
				name: '🔗  PERMANENT INVITE LINK',
				value: `**${(await getInvite(guild)).link}**`,
			}],
		}),
	},
};

async function getChannelMention(guild: Guild, name: string): Promise<string> {
	const channel = await findChannelByName(guild, name);
	if (!channel) return name;

	return mention(channel.id, 'CHANNEL');
}

export { getChannelMention };
export type { InformationSection };
export default information;
