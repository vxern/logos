import configuration from "../../../../configuration.js";
import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { ruleIds } from "../../../commands/moderation/commands/rule.js";
import { getTextChannel } from "../../../utils.js";
import { getLastUpdateString } from "../notices.js";
import { BaseInvite, Bot, CreateMessage, Embed, Guild, InviteMetadata, createInvite, getInvites } from "discordeno";

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
			tldr: localise(client, "rules.tldr", defaultLocale)(),
			summary: localise(client, `rules.${ruleId}.summary`, defaultLocale)(),
			content: localise(client, `rules.${ruleId}.content`, defaultLocale)(),
		};

		return {
			name: `${constants.symbols.ruleBullet}  #${index + 1} ~ **${strings.title.toUpperCase()}**  ~  ${
				strings.tldr
			}: *${strings.summary}*`,
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
		invite: localise(client, "notices.notices.information.invite", defaultLocale)(),
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
	const invites = await getInvites(bot, guild.id)
		.then((invites) => invites.array())
		.catch(() => {
			client.log.warn(`Failed to get invites on ${guild.name}.`);
			return undefined;
		});
	if (invites === undefined) {
		return undefined;
	}

	const viableInvites = invites.filter((invite) => invite.maxAge === 0);
	const mostViableInvite = viableInvites.find((invite) => invite.maxAge === 0 && invite.inviter?.id === guild.ownerId);
	if (mostViableInvite !== undefined) {
		return mostViableInvite;
	}

	const inviteLinkChannel = getTextChannel(guild, configuration.guilds.channels.welcome);
	if (inviteLinkChannel === undefined) {
		return undefined;
	}

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
