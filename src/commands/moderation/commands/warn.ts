import {
	ApplicationCommandFlags,
	Bot,
	editMember,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { reason, user } from 'logos/src/commands/parameters.ts';
import { getActiveWarnings } from 'logos/src/commands/moderation/module.ts';
import { log } from 'logos/src/controllers/logging/logging.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { isAutocomplete, parseArguments } from 'logos/src/interactions.ts';
import { diagnosticMentionUser, getTextChannel } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.warn),
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	handle: handleWarnUser,
	options: [user, reason],
};

async function handleWarnUser(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user, reason }, focused] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) return;

	if (isAutocomplete(interaction) && focused?.name === 'user') return;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const moderatorRoleIds = guild.roles.array().filter((role) =>
		[configuration.permissions.moderatorRoleNames.main, ...configuration.permissions.moderatorRoleNames.others]
			.includes(role.name)
	)
		.map((role) => role.id);
	if (moderatorRoleIds.length === 0) return undefined;

	if (reason!.length === 0) return displayError(bot, interaction);

	const [author, recipient] = await Promise.all([
		client.database.adapters.users.getOrFetchOrCreate(
			client,
			'id',
			interaction.user.id.toString(),
			interaction.user.id,
		),
		client.database.adapters.users.getOrFetchOrCreate(client, 'id', member.id.toString(), member.id),
	]);

	if (author === undefined || recipient === undefined) return displayError(bot, interaction);

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
		log([client, bot], guild, 'memberWarnAdd', member, document.data, interaction.user);
	}

	if (warnings === undefined || document === undefined) return displayError(bot, interaction);

	const relevantWarnings = getActiveWarnings(warnings);

	sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: localise(Commands.warn.strings.warned, interaction.locale)(
					mention(member.id, MentionTypes.User),
					relevantWarnings.size,
				),
				color: constants.colors.blue,
			}],
		},
	});

	const moderationChannelId = getTextChannel(guild, configuration.guilds.channels.moderation)?.id;
	if (moderationChannelId === undefined) return;

	const passedLimit = relevantWarnings.size > configuration.commands.warn.limitUses;
	if (passedLimit) {
		const passedLimitMessage = localise(Commands.warn.strings.passedLimit, defaultLocale)(
			diagnosticMentionUser(member.user!),
			configuration.commands.warn.limitUses,
			relevantWarnings.size,
		);

		try {
			editMember(bot, guild.id, member.id, {
				communicationDisabledUntil: Date.now() + configuration.commands.warn.timeoutDuration,
			});
		} catch {}

		return void sendMessage(bot, moderationChannelId, {
			embeds: [{
				description: `${constants.symbols.indicators.exclamation} ${passedLimitMessage}`,
				color: constants.colors.red,
			}],
		});
	}

	const reachedLimit = relevantWarnings.size === configuration.commands.warn.limitUses;
	if (reachedLimit) {
		const reachedLimitMessage = localise(Commands.warn.strings.reachedLimit, defaultLocale)(
			diagnosticMentionUser(member.user!),
			configuration.commands.warn.limitUses,
		);

		return void sendMessage(bot, moderationChannelId, {
			embeds: [{
				description: `${constants.symbols.indicators.warning} ${reachedLimitMessage}`,
				color: constants.colors.yellow,
			}],
		});
	}
}

function displayError(bot: Bot, interaction: Interaction): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(Commands.warn.strings.failed, interaction.locale),
					color: constants.colors.red,
				}],
			},
		},
	);
}

export default command;
