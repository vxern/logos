import { BaseInvite, Bot, createInvite, CreateMessage, Embed, getInvites, Guild, InviteMetadata } from 'discordeno';
import { ruleIds } from 'logos/src/commands/moderation/commands/rule.ts';
import { getLastUpdateString } from 'logos/src/services/notices.ts';
import { Client, localise } from 'logos/src/client.ts';
import { getTextChannel } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const lastUpdatedAt = new Date(2023, 2, 19);

async function generateInformationNotice([client, bot]: [Client, Bot], guild: Guild): Promise<CreateMessage> {
	const ruleSection = getRulesSection(client);

	const invite = await getOrCreateInvite(bot, guild);
	if (invite === undefined) {
		return { embeds: [ruleSection] };
	}

	const inviteSection = getInviteSection(client, invite);

	return { embeds: [ruleSection, inviteSection] };
}

function getRulesSection(client: Client): Embed {
	const fields = ruleIds.map((ruleId, index) => {
		const titleString = localise(client, `rules.${ruleId}.title`, defaultLocale)()
			.toUpperCase();
		const tldrString = localise(client, 'rules.tldr', defaultLocale)();
		const summaryString = localise(
			client,
			`rules.${ruleId}.summary`,
			defaultLocale,
		)();

		return {
			name: `${constants.symbols.ruleBullet}  #${index + 1} ~ **${titleString}**  ~  ${tldrString}: *${summaryString}*`,
			value: localise(client, `rules.${ruleId}.content`, defaultLocale)(),
			inline: false,
		};
	});

	return {
		description: getLastUpdateString(client, lastUpdatedAt, defaultLocale),
		color: constants.colors.peach,
		fields: fields,
	};
}

function getInviteSection(client: Client, invite: InviteMetadata | BaseInvite): Embed {
	const inviteString = localise(client, 'notices.notices.information.invite', defaultLocale)();
	const link = constants.links.generateDiscordInviteLink(invite.code);

	return {
		color: constants.colors.gray,
		fields: [{ name: `${constants.symbols.information.inviteLink}  ${inviteString}`, value: `**${link}**` }],
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
