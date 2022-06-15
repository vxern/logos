import { EmbedPayload, Guild } from '../../../../../deps.ts';
import configuration from '../../../../configuration.ts';
import { bold, italic, mention, MentionType } from '../../../../formatting.ts';
import { findChannelByName, fromHex, getInvite } from '../../../../utils.ts';
import rules from './rules.ts';

interface Section {
	image: string;
	color: number;
	generateEmbed: (guild: Guild) => Promise<EmbedPayload>;
}

interface InformationSections {
	[key: string]: Section;
}

const information: InformationSections = {
	rules: {
		image: 'https://i.imgur.com/wRBpXcY.png',
		color: fromHex('#ff9a76'),
		generateEmbed: async (guild) => {
			const fields = [];
			for (const [title, generateRule] of Object.entries(rules)) {
				const rule = await generateRule(guild);
				fields.push({
					name: `💠  ${bold(title.toUpperCase())}  ~  TLDR: ${
						italic(rule.summary)
					}`,
					value: rule.paragraph,
					inline: false,
				});
			}

			const guildRoles = await guild.roles.array();
			const moderatorRole = guildRoles.find((role) =>
				role.name === configuration.guilds.moderator.role
			)!;

			fields.push({
				name: 'ℹ️  MODERATION POLICY',
				value:
					`The server abides by a 3-warn moderation policy, enforced by the server's ${
						mention(moderatorRole.id, MentionType.ROLE)
					}s. The above rules apply to the entirety of the server, and a breach thereof will cause a warning to be issued.\n\nDepending on the circumstances, a timeout may be issued to the member for the duration of 5, 10, or 60 minutes respectively.\n\nIf a member received three warnings, and a situation occurs where a fourth warning would be issued, the member will be kicked instead.\n\nFor members who show no regard for the server rules, and are not interested in making useful contributions, a permanent ban may be issued.`,
				inline: false,
			});

			return {
				description: italic('Last updated: 15th June 2022'),
				fields: fields,
			};
		},
	},
	/*
  categories: {
    image: "https://i.imgur.com/NRTrDdO.png",
    color: fromHex("#679B9B"),
    generateEmbed: async (guild: Guild) => {
      const fields = [];
      for (
        const [title, generateCategoryDescription] of Object.entries(categories)
      ) {
        fields.push({
          name: `${bold(title.toUpperCase())}`,
          value: await generateCategoryDescription(client, guild),
          inline: false,
        });
      }

      return {
        fields: fields,
      };
    },
  },*/
	invite: {
		image: 'https://i.imgur.com/snJaKYm.png',
		color: fromHex('#637373'),
		generateEmbed: async (guild) => {
			const invite = await getInvite(guild);

			return {
				fields: [{
					name: '🔗  PERMANENT INVITE LINK',
					value: bold(invite.link),
				}],
			};
		},
	},
};

async function getChannelMention(guild: Guild, name: string): Promise<string> {
	return mention(
		(await findChannelByName(guild, name))!.id,
		MentionType.CHANNEL,
	);
}

export default information;
export { getChannelMention };
export type { Section };
