import { BaseInvite, Bot, createInvite, Embed, getInvites, Guild, InviteMetadata } from 'discordeno';
import { Information, localise } from 'logos/assets/localisations/mod.ts';
import { Client } from 'logos/src/client.ts';
import { fromHex, getTextChannel } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { links } from 'logos/constants.ts';
import { list, mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLanguage } from 'logos/types.ts';

/** Represents a section of guild information. */
interface InformationSection {
	/** The image associated with the section. */
	image: string;

	/** The method to generate the embed. */
	generateEmbed: (
		[client, bot]: [Client, Bot],
		guild: Guild,
	) => Promise<Embed | undefined> | (Embed | undefined);
}

/** The defined sections of information for guilds. */
const informationSections: Record<string, InformationSection> = {
	rules: {
		image: 'https://i.imgur.com/wRBpXcY.png',
		generateEmbed: (_clientWithBot, guild) => {
			const fields = [];
			for (const rule of Object.values(Information.rules.rules)) {
				fields.push({
					name: `💠  **${localise(rule.title, defaultLanguage).toUpperCase()}**  ~  ${
						localise(Information.rules.tldr, defaultLanguage)
					}: *${localise(rule.summary, defaultLanguage)}*`,
					value: localise(rule.content, defaultLanguage),
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
				name: `ℹ️  ${localise(Information.rules.moderationPolicy.header, defaultLanguage)}`,
				value: list([
					localise(Information.rules.moderationPolicy.body.points.one, defaultLanguage)(moderatorRoleMention),
					localise(Information.rules.moderationPolicy.body.points.two, defaultLanguage),
					localise(Information.rules.moderationPolicy.body.points.three, defaultLanguage),
					localise(Information.rules.moderationPolicy.body.points.four, defaultLanguage),
				]),
				inline: false,
			});

			return {
				description: localise(Information.rules.lastUpdated, defaultLanguage),
				color: fromHex('#ff9a76'),
				fields: fields,
			};
		},
	},
	invite: {
		image: 'https://i.imgur.com/snJaKYm.png',
		generateEmbed: async ([_client, bot], guild) => {
			const invite = await getInvite(bot, guild);
			if (invite === undefined) return;

			return {
				color: fromHex('#637373'),
				fields: [{
					name: `🔗  ${localise(Information.invite, defaultLanguage)}`,
					value: `**${links.generateDiscordInviteLink(invite.code)}**`,
				}],
			};
		},
	},
};

async function getInvite(
	bot: Bot,
	guild: Guild,
): Promise<InviteMetadata | BaseInvite | undefined> {
	const invites = (await getInvites(bot, guild.id)).array();
	const viableInvites = invites.filter((invite) => invite.maxAge === 0);
	const mostViableInvite = viableInvites.find((invite) => invite.maxAge === 0 && invite.inviter?.id === guild.ownerId);
	if (mostViableInvite !== undefined) return mostViableInvite;

	const inviteLinkChannel = getTextChannel(guild, 'welcome');
	if (inviteLinkChannel === undefined) return undefined;

	const newInvite = await createInvite(bot, inviteLinkChannel.id, {
		maxAge: 0,
		maxUses: 0,
		temporary: false,
		unique: false,
	});

	return newInvite;
}

export type { InformationSection };
export default informationSections;
