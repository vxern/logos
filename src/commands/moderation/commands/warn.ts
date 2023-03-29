import {
	ApplicationCommandFlags,
	ApplicationCommandTypes,
	Bot,
	editMember,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { reason, user } from 'logos/src/commands/parameters.ts';
import { getActiveWarnings } from 'logos/src/commands/moderation/module.ts';
import { logEvent } from 'logos/src/controllers/logging/logging.ts';
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import { diagnosticMentionUser, getTextChannel } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

const command: CommandTemplate = {
	name: 'warn',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	handle: handleWarnUser,
	handleAutocomplete: handleWarnUserAutocomplete,
	options: [user, reason],
};

async function handleWarnUserAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});

	return autocompleteMembers(
		[client, bot],
		interaction,
		user!,
		{
			restrictToNonSelf: true,
			excludeModerators: true,
		},
	);
}

async function handleWarnUser([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user, reason }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) return;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const moderatorRoleIds = guild.roles.array().filter((role) =>
		[configuration.permissions.moderatorRoleNames.main, ...configuration.permissions.moderatorRoleNames.others]
			.includes(role.name)
	)
		.map((role) => role.id);
	if (moderatorRoleIds.length === 0) return undefined;

	if (reason!.length === 0) return displayError([client, bot], interaction);

	const [author, recipient] = await Promise.all([
		client.database.adapters.users.getOrFetchOrCreate(
			client,
			'id',
			interaction.user.id.toString(),
			interaction.user.id,
		),
		client.database.adapters.users.getOrFetchOrCreate(client, 'id', member.id.toString(), member.id),
	]);

	if (author === undefined || recipient === undefined) return displayError([client, bot], interaction);

	const [warnings, document] = await Promise.all([
		client.database.adapters.warnings.getOrFetch(client, 'recipient', recipient.ref),
		client.database.adapters.warnings.create(client, {
			createdAt: Date.now(),
			author: author.ref,
			recipient: recipient.ref,
			reason: reason!,
		}),
	]);

	if (document !== undefined) {
		logEvent([client, bot], guild, 'memberWarnAdd', [member, document.data, interaction.user]);
	}

	if (warnings === undefined || document === undefined) return displayError([client, bot], interaction);

	const relevantWarnings = getActiveWarnings(warnings);

	sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: localise(client, 'warn.strings.warned', interaction.locale)(
					{
						'user_mention': mention(member.id, MentionTypes.User),
						'number': relevantWarnings.size,
					},
				),
				color: constants.colors.blue,
			}],
		},
	});

	const moderationChannelId = getTextChannel(guild, configuration.guilds.channels.moderation)?.id;
	if (moderationChannelId === undefined) return;

	const passedLimit = relevantWarnings.size > configuration.commands.warn.limitUses;
	if (passedLimit) {
		const passedLimitString = localise(client, 'warn.strings.passedLimit', defaultLocale)(
			{
				'user_mention': diagnosticMentionUser(member.user!),
				'limit': configuration.commands.warn.limitUses,
				'number': relevantWarnings.size,
			},
		);

		try {
			editMember(bot, guild.id, member.id, {
				communicationDisabledUntil: Date.now() + configuration.commands.warn.timeoutDuration,
			});
		} catch {}

		return void sendMessage(bot, moderationChannelId, {
			embeds: [{
				description: `${constants.symbols.indicators.exclamation} ${passedLimitString}`,
				color: constants.colors.red,
			}],
		});
	}

	const reachedLimit = relevantWarnings.size === configuration.commands.warn.limitUses;
	if (reachedLimit) {
		const reachedLimitString = localise(client, 'warn.strings.reachedLimit', defaultLocale)(
			{
				'mention_user': diagnosticMentionUser(member.user!),
				'limit': configuration.commands.warn.limitUses,
			},
		);

		return void sendMessage(bot, moderationChannelId, {
			embeds: [{
				description: `${constants.symbols.indicators.warning} ${reachedLimitString}`,
				color: constants.colors.yellow,
			}],
		});
	}
}

function displayError([client, bot]: [Client, Bot], interaction: Interaction): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(client, 'warn.strings.failed', interaction.locale)(),
					color: constants.colors.red,
				}],
			},
		},
	);
}

export default command;
