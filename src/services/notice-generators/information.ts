import { BaseInvite, Bot, createInvite, CreateMessage, Embed, getInvites, Guild, InviteMetadata } from 'discordeno';
import { localise, Services } from 'logos/assets/localisations/mod.ts';
import { getLastUpdateString } from 'logos/src/services/notices.ts';
import configuration from 'logos/configuration.ts';
import { getTextChannel } from 'logos/src/utils.ts';
import { defaultLocale } from 'logos/types.ts';
import { list, mention, MentionTypes } from 'logos/formatting.ts';
import constants from 'logos/constants.ts';

const lastUpdatedAt = new Date(2022, 8, 8);

async function generateInformationNotice(bot: Bot, guild: Guild): Promise<CreateMessage> {
	const ruleSection = getRulesSection(guild);

	const invite = await getOrCreateInvite(bot, guild);
	if (invite === undefined) {
		return { embeds: [ruleSection] };
	}

	const inviteSection = getInviteSection(invite);

	return { embeds: [ruleSection, inviteSection] };
}

function getRulesSection(guild: Guild): Embed {
	const rules = Object.values(Services.notices.notices.information.rules.rules);

	const fields = [];
	for (const [rule, index] of rules.map<[typeof rules[number], number]>((rule, index) => [rule, index])) {
		const titleString = localise(rule.title, defaultLocale).toUpperCase();
		const tldrString = localise(Services.notices.notices.information.rules.tldr, defaultLocale);
		const summaryString = localise(rule.summary, defaultLocale);

		fields.push({
			name: `💠  #${index + 1} ~ **${titleString}**  ~  ${tldrString}: *${summaryString}*`,
			value: localise(rule.content, defaultLocale),
			inline: false,
		});
	}

	const moderatorRoleId = guild.roles.array().find((role) => role.name === configuration.permissions.moderatorRoleName)
		?.id;
	const moderatorRoleMention = moderatorRoleId
		? mention(moderatorRoleId, MentionTypes.Role)
		: configuration.permissions.moderatorRoleName.toLowerCase();

	const moderationPolicyString = localise(
		Services.notices.notices.information.rules.moderationPolicy.header,
		defaultLocale,
	);

	fields.push({
		name: `ℹ️  ${moderationPolicyString}`,
		value: list([
			localise(Services.notices.notices.information.rules.moderationPolicy.body.points.one, defaultLocale)(
				moderatorRoleMention,
			),
			localise(Services.notices.notices.information.rules.moderationPolicy.body.points.two, defaultLocale),
			localise(Services.notices.notices.information.rules.moderationPolicy.body.points.three, defaultLocale),
			localise(Services.notices.notices.information.rules.moderationPolicy.body.points.four, defaultLocale),
		]),
		inline: false,
	});

	return {
		description: getLastUpdateString(lastUpdatedAt, defaultLocale),
		color: constants.colors.peach,
		fields: fields,
	};
}

function getInviteSection(invite: InviteMetadata | BaseInvite): Embed {
	const inviteString = localise(Services.notices.notices.information.invite, defaultLocale);
	const link = constants.links.generateDiscordInviteLink(invite.code);

	return {
		color: constants.colors.gray,
		fields: [{ name: `🔗  ${inviteString}`, value: `**${link}**` }],
	};
}

async function getOrCreateInvite(bot: Bot, guild: Guild): Promise<InviteMetadata | BaseInvite | undefined> {
	const invites = (await getInvites(bot, guild.id)).array();
	const viableInvites = invites.filter((invite) => invite.maxAge === 0);
	const mostViableInvite = viableInvites.find((invite) => invite.maxAge === 0 && invite.inviter?.id === guild.ownerId);
	if (mostViableInvite !== undefined) return mostViableInvite;

	const inviteLinkChannel = getTextChannel(guild, configuration.guilds.channels.welcome);
	if (inviteLinkChannel === undefined) return undefined;

	const newInvite = await createInvite(bot, inviteLinkChannel.id, {
		maxAge: 0,
		maxUses: 0,
		temporary: false,
		unique: false,
	});

	return newInvite;
}

export { generateInformationNotice, lastUpdatedAt };
