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
import { getOrCreateUser } from 'logos/src/database/adapters/users.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import { guildAsAuthor } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLanguage } from 'logos/types.ts';

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

	const member = resolveInteractionToMember([client, bot], interaction, user);
	if (member === undefined) return;

	if (member.id === interaction.member?.id) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.warn.strings.cannotWarnSelf, interaction.locale),
						color: configuration.messages.colors.yellow,
					}],
				},
			},
		);
	}

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const moderatorRoleId = guild.roles.find((role) => role.name === configuration.permissions.moderatorRoleName)?.id;
	if (moderatorRoleId === undefined) return;

	const isModerator = member.roles.includes(moderatorRoleId);
	if (isModerator) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.warn.strings.cannotWarnCertainUsers, interaction.locale),
						color: configuration.messages.colors.yellow,
					}],
				},
			},
		);
	}

	if (reason!.length === 0) return displayError(bot, interaction);

	const [subject, author] = await Promise.all([
		getOrCreateUser(client, 'id', member.id.toString()),
		getOrCreateUser(client, 'id', interaction.user.id.toString()),
	]);

	if (subject === undefined || author === undefined) return displayError(bot, interaction);

	const [warnings, document, dmChannel] = await Promise.all([
		client.database.adapters.warnings.get(client, 'reference', subject.ref),
		client.database.adapters.warnings.create(client, { author: author.ref, subject: subject.ref, reason: reason! }),
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
					relevantWarnings.length,
				),
				color: configuration.messages.colors.blue,
			}],
		},
	});

	const reachedKickStage = relevantWarnings.length >= configuration.commands.warn.limit + 1;
	const reachedBanStage = relevantWarnings.length >= configuration.commands.warn.limit + 2;

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
										description: localise(Commands.warn.strings.reachedBanStage, defaultLanguage)(reason!),
										color: configuration.messages.colors.darkRed,
									}
									: {
										description: localise(Commands.warn.strings.reachedKickStage, defaultLanguage)(reason!),
										color: configuration.messages.colors.red,
									}
							)
							: {
								description: localise(Commands.warn.strings.warnedDirect, defaultLanguage)(
									reason!,
									relevantWarnings.length,
									configuration.commands.warn.limit,
								),
								color: configuration.messages.colors.yellow,
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
				reason: `Banned due to having received too many warnings (${relevantWarnings.length}).`,
			},
		);
	}

	if (reachedKickStage) {
		return kickMember(
			bot,
			interaction.guildId!,
			member.id,
			`Kicked due to having received too many warnings (${relevantWarnings.length}).`,
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
					color: configuration.messages.colors.red,
				}],
			},
		},
	);
}

export default command;
