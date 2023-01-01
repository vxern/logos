import {
	ApplicationCommandFlags,
	banMember,
	Bot,
	getDmChannel,
	Interaction,
	InteractionResponseTypes,
	kickMember,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { reason, user } from 'logos/src/commands/parameters.ts';
import { getActiveWarnings } from 'logos/src/commands/moderation/module.ts';
import { log } from 'logos/src/controllers/logging/logging.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import { guildAsAuthor } from 'logos/src/utils.ts';
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
	const [{ user, reason }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) return;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const moderatorRoleId = guild.roles.find((role) => role.name === configuration.permissions.moderatorRoleName)?.id;
	if (moderatorRoleId === undefined) return;

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

	const [warnings, document, dmChannel] = await Promise.all([
		client.database.adapters.warnings.getOrFetch(client, 'recipient', recipient.ref),
		client.database.adapters.warnings.create(client, {
			createdAt: Date.now(),
			author: author.ref,
			recipient: recipient.ref,
			reason: reason!,
		}),
		getDmChannel(bot, member.id).catch(() => undefined),
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

	const reachedKickStage = relevantWarnings.size >= configuration.commands.warn.limitUses + 1;
	const reachedBanStage = relevantWarnings.size >= configuration.commands.warn.limitUses + 2;

	if (dmChannel !== undefined) {
		sendMessage(bot, dmChannel.id, {
			embeds: [
				{
					author: guildAsAuthor(bot, guild),
					...(
						reachedKickStage
							? (
								reachedBanStage
									? {
										description: localise(Commands.warn.strings.reachedBanStage, defaultLocale)(reason!),
										color: constants.colors.darkRed,
									}
									: {
										description: localise(Commands.warn.strings.reachedKickStage, defaultLocale)(reason!),
										color: constants.colors.red,
									}
							)
							: {
								description: localise(Commands.warn.strings.warnedDirect, defaultLocale)(
									reason!,
									relevantWarnings.size,
									configuration.commands.warn.limitUses,
								),
								color: constants.colors.dullYellow,
							}
					),
				},
			],
		});
	}

	if (reachedBanStage) {
		return banMember(
			bot,
			interaction.guildId!,
			member.id,
			{
				reason: `Banned due to having received too many warnings (${relevantWarnings.size}).`,
			},
		);
	}

	if (reachedKickStage) {
		return kickMember(
			bot,
			interaction.guildId!,
			member.id,
			`Kicked due to having received too many warnings (${relevantWarnings.size}).`,
		);
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
