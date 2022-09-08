import {
	BaseInvite,
	createInvite,
	Embed,
	getInvites,
	Guild,
	InviteMetadata,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { mention, MentionTypes } from '../../../../formatting.ts';
import { fromHex, getTextChannel } from '../../../../utils.ts';
import ruleGenerators from './generators/rules.ts';

/** Represents a section of guild information. */
interface InformationSection {
	/** The image associated with the section. */
	image: string;

	/** The method to generate the embed. */
	generateEmbed: (
		client: Client,
		guild: Guild,
	) => Promise<Embed | undefined> | (Embed | undefined);
}

/** The defined sections of information for guilds. */
const informationSections: Record<string, InformationSection> = {
	rules: {
		image: 'https://i.imgur.com/wRBpXcY.png',
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

			const moderatorRoleId = guild.roles.array().find((role) =>
				role.name === configuration.guilds.moderation.moderator
			)?.id;
			const moderatorRoleMention = moderatorRoleId
				? mention(moderatorRoleId, MentionTypes.Role)
				: configuration.guilds.moderation.moderator.toLowerCase();

			fields.push({
				name: 'ℹ️  MODERATION POLICY',
				value:
					`The server abides by a 3-warn moderation policy, enforced by the server's ${moderatorRoleMention}s. The above rules apply to the entirety of the server, and a breach thereof will cause a warning to be issued.\n\nDepending on the circumstances, a timeout may be issued to the member for the duration of 5, 15, or 60 minutes respectively.\n\nIf a member received three warnings, and a situation occurs where a fourth warning would be issued, the member will be kicked instead.`,
				inline: false,
			});

			return {
				description: '*Last updated: 8th September 2022*',
				color: fromHex('#ff9a76'),
				fields: fields,
			};
		},
	},
	invite: {
		image: 'https://i.imgur.com/snJaKYm.png',
		generateEmbed: async (client, guild) => {
			const invite = await getInvite(client, guild);
			if (!invite) return;

			return {
				color: fromHex('#637373'),
				fields: [{
					name: '🔗  PERMANENT INVITE LINK',
					value: `**https://discord.gg/${invite.code}**`,
				}],
			};
		},
	},
};

async function getInvite(
	client: Client,
	guild: Guild,
): Promise<InviteMetadata | BaseInvite | undefined> {
	const invites = (await getInvites(client.bot, guild.id)).array();
	const viableInvites = invites.filter((invite) => invite.maxAge === 0);
	const mostViableInvite = viableInvites.find((invite) =>
		invite.maxAge === 0 && invite.inviter?.id === guild.ownerId
	);
	if (mostViableInvite) return mostViableInvite;

	const inviteLinkChannel = getTextChannel(guild, 'welcome');
	if (!inviteLinkChannel) return undefined;

	const newInvite = await createInvite(client.bot, inviteLinkChannel.id, {
		maxAge: 0,
		maxUses: 0,
		temporary: false,
		unique: false,
	});

	return newInvite;
}

function getChannelMention(guild: Guild, name: string): string {
	const channel = getTextChannel(guild, name);
	if (!channel) return name;

	return mention(channel.id, MentionTypes.Channel);
}

export { getChannelMention };
export type { InformationSection };
export default informationSections;
