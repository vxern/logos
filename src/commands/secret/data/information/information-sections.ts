import { BitwisePermissionFlags, Embed, Guild } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { mention, MentionTypes } from '../../../../formatting.ts';
import { fromHex, getTextChannel } from '../../../../utils.ts';
import ruleGenerators from './generators/rules.ts';

/** Represents a section of guild information. */
interface InformationSection {
	/** The image associated with the section. */
	image: string;

	/** The embed ribbon colour for the section. */
	color: number;

	/** The method to generate the embed. */
	generateEmbed: (client: Client, guild: Guild) => Embed | undefined;
}

/** The defined sections of information for guilds. */
const informationSections: Record<string, InformationSection> = {
	rules: {
		image: 'https://i.imgur.com/wRBpXcY.png',
		color: fromHex('#ff9a76'),
		generateEmbed: (_client, guild) => {
			const fields = [];
			for (const [title, generateRule] of Object.entries(ruleGenerators)) {
				const rule = generateRule(guild);
				fields.push({
					name: `💠  **${title.toUpperCase()}**  ~  TLDR: *${rule.summary}*`,
					value: rule.content,
					inline: false,
				});
			}

			const manageMembersRoles = guild.roles.array().filter((role) =>
				role.permissions & BigInt(BitwisePermissionFlags['VIEW_CHANNEL']!)
			);

			const moderatorRole =
				manageMembersRoles.find((role) =>
					role.name === configuration.guilds.moderation.moderator
				) ?? manageMembersRoles.reduce((previous, current) =>
					current.position < previous.position ? current : previous
				);

			const moderatorRoleMention = !moderatorRole
				? configuration.guilds.moderation.moderator.toLowerCase()
				: mention(moderatorRole.id, MentionTypes.Role);

			fields.push({
				name: 'ℹ️  MODERATION POLICY',
				value:
					`The server abides by a 3-warn moderation policy, enforced by the server's ${moderatorRoleMention}s. The above rules apply to the entirety of the server, and a breach thereof will cause a warning to be issued.\n\nDepending on the circumstances, a timeout may be issued to the member for the duration of 5, 15, or 60 minutes respectively.\n\nIf a member received three warnings, and a situation occurs where a fourth warning would be issued, the member will be kicked instead.\n\nFor members who show no regard for the server rules, and are not interested in making useful contributions, a permanent ban may be issued.`,
				inline: false,
			});

			return {
				description: '*Last updated: 25th August 2022*',
				fields: fields,
			};
		},
	},
	// TODO: Reimplement invite category once invite helpers and types are fixed in discordeno.
	/*
	invite: {
		image: 'https://i.imgur.com/snJaKYm.png',
		color: fromHex('#637373'),
		generateEmbed: async (_client, guild) => {
			const invite = await getInvite(guild);
			if (!invite) return undefined;

			return {
				fields: [{
					name: '🔗  PERMANENT INVITE LINK',
					value: `**${invite.link}**`,
				}],
			};
		},
	},
  */
};

// TODO: Reimplement `getInvite()` once invite helpers and types are fixed in discordeno.
/*
async function getInvite(
	client: Client,
	guild: Guild,
): Promise<Invite | undefined> {
	// @ts-ignore
	const invites = (await getInvites(client.bot, guildId)).array();

	// Invites that do not expire.
	const viableInvites = invites.filter((invite) => invite.maxAge === 0);

	const invite = viableInvites.find((invite) =>
		invite.maxAge === 0 && invite.inviter?.id === guild.ownerId
	);
  if (invite) return invite;

  const inviteLinkChannel = getTextChannel(guild, 'welcome');
  if (!inviteLinkChannel) return undefined;

  const newInvite: Invite = await createInvite(client.bot, inviteLinkChannel.id, {
    maxAge: 0,
    maxUses: 0,
    temporary: false,
    unique: false,
  });

	return newInvite;
}
*/

function getChannelMention(guild: Guild, name: string): string {
	const channel = getTextChannel(guild, name);
	if (!channel) return name;

	return mention(channel.id, MentionTypes.Channel);
}

export { getChannelMention };
export type { InformationSection };
export default informationSections;
