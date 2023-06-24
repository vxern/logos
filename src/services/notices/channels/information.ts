import { BaseInvite, Bot, createInvite, CreateMessage, Embed, getInvites, Guild, InviteMetadata } from 'discordeno';
import { ruleIds } from 'logos/src/commands/moderation/commands/rule.ts';
import { getLastUpdateString } from 'logos/src/services/notices/notices.ts';
import { Client, localise } from 'logos/src/client.ts';
import { getTextChannel } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const lastUpdatedAt = new Date(2023, 2, 19);

async function generateInformationNotice([client, bot]: [Client, Bot], guild: Guild): Promise<CreateMessage> {
	const ruleSection = getRulesSection(client);

	const invite = await getOrCreateInvite([client, bot], guild);
	if (invite === undefined) {
		return { embeds: [ruleSection] };
	}

	const inviteSection = getInviteSection(client, invite);

	return { embeds: [ruleSection, inviteSection] };
}

function getRulesSection(client: Client): Embed {
	const fields = ruleIds.map((ruleId, index) => {
		const strings = {
			title: localise(client, `rules.${ruleId}.title`, defaultLocale)(),
			tldr: localise(client, 'rules.tldr', defaultLocale)(),
			summary: localise(client, `rules.${ruleId}.summary`, defaultLocale)(),
			content: localise(client, `rules.${ruleId}.content`, defaultLocale)(),
		};

		return {
			name: `${constants.symbols.ruleBullet}  #${
				index + 1
			} ~ **${strings.title.toUpperCase()}**  ~  ${strings.tldr}: *${strings.summary}*`,
			value: strings.content,
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
	const link = constants.links.generateDiscordInviteLink(invite.code);

	const strings = {
		invite: localise(client, 'notices.notices.information.invite', defaultLocale)(),
	};

	return {
		color: constants.colors.gray,
		fields: [{ name: `${constants.symbols.information.inviteLink}  ${strings.invite}`, value: `**${link}**` }],
	};
}

async function getOrCreateInvite(
	[client, bot]: [Client, Bot],
	guild: Guild,
): Promise<InviteMetadata | BaseInvite | undefined> {
	const invites = await getInvites(bot, guild.id).then((invites) => invites.array())
		.catch(() => {
			client.log.warn(`Failed to get invites on ${guild.name}.`);
			return undefined;
		});
	if (invites === undefined) return undefined;

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
	}).catch(() => {
		client.log.warn(`Failed to create invite on ${guild.name}.`);
		return undefined;
	});

	return newInvite;
}

export { generateInformationNotice, lastUpdatedAt };
