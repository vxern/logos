import {
	ApplicationCommandFlags,
	ApplicationCommandTypes,
	Bot,
	Embed,
	Guild,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client, localise } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import configuration from 'logos/configuration.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

const command: CommandTemplate = {
	name: 'policy',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleDisplayModerationPolicy,
	options: [show],
};

function handleDisplayModerationPolicy([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const locale = show ? defaultLocale : interaction.locale;

	return void sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
			embeds: [{
				title: localise(client, 'policies.moderation.header', interaction.locale)(),
				fields: getModerationPolicyPoints(client, guild, locale),
			}],
		},
	});
}

function getModerationPolicyPoints(
	client: Client,
	guild: Guild,
	locale: string | undefined,
): NonNullable<Embed['fields']> {
	const moderatorRoleId = guild.roles.array()
		.find((role) => role.name === configuration.permissions.moderatorRoleNames.main)?.id;
	const moderatorRoleMention = moderatorRoleId !== undefined
		? mention(moderatorRoleId, MentionTypes.Role)
		: configuration.permissions.moderatorRoleNames.main.toLowerCase();

	return [{
		name: localise(client, 'policies.moderation.points.introduction.header', locale)(),
		value: localise(client, 'policies.moderation.points.introduction.body', locale)(
			{ 'role_mention': moderatorRoleMention },
		),
	}, {
		name: localise(client, 'policies.moderation.points.breach.header', locale)(),
		value: localise(client, 'policies.moderation.points.breach.body', locale)(),
	}, {
		name: localise(client, 'policies.moderation.points.warnings.header', locale)(),
		value: localise(client, 'policies.moderation.points.warnings.body', locale)(),
	}, {
		name: localise(client, 'policies.moderation.points.furtherAction.header', locale)(),
		value: localise(client, 'policies.moderation.points.furtherAction.body', locale)(),
	}, {
		name: localise(client, 'policies.moderation.points.ban.header', locale)(),
		value: localise(client, 'policies.moderation.points.ban.body', locale)(),
	}];
}

export default command;
