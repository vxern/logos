import { ApplicationCommandTypes, Bot, editMember, Interaction, sendMessage } from 'discordeno';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { reason, user } from 'logos/src/commands/parameters.ts';
import { getActiveWarnings } from 'logos/src/commands/moderation/module.ts';
import { logEvent } from 'logos/src/controllers/logging/logging.ts';
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments, reply } from 'logos/src/interactions.ts';
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

	const strings = {
		title: localise(client, 'warn.strings.warned.title', interaction.locale)(),
		description: localise(client, 'warn.strings.warned.description', interaction.locale)(
			{
				'user_mention': mention(member.id, MentionTypes.User),
				'number': relevantWarnings.size,
			},
		),
	};

	reply([client, bot], interaction, {
		embeds: [{
			title: strings.title,
			description: strings.description,
			color: constants.colors.blue,
		}],
	});

	const moderationChannelId = getTextChannel(guild, configuration.guilds.channels.guideChat)?.id;
	if (moderationChannelId === undefined) return;

	const surpassedLimit = relevantWarnings.size > configuration.commands.warn.limitUses;
	if (surpassedLimit) {
		const strings = {
			title: localise(client, 'warn.strings.limitSurpassed.title', defaultLocale)(),
			description: localise(client, 'warn.strings.limitSurpassed.description', defaultLocale)(
				{
					'user_mention': diagnosticMentionUser(member.user!),
					'limit': configuration.commands.warn.limitUses,
					'number': relevantWarnings.size,
				},
			),
		};

		editMember(bot, guild.id, member.id, {
			communicationDisabledUntil: Date.now() + configuration.commands.warn.timeoutDuration,
		}).catch(() => client.log.warn(`Failed to edit timeout state of member with ID ${member.id}.`));

		return void sendMessage(bot, moderationChannelId, {
			embeds: [{
				title: `${constants.symbols.indicators.exclamation} ${strings.title}`,
				description: strings.description,
				color: constants.colors.red,
			}],
		});
	}

	const reachedLimit = relevantWarnings.size === configuration.commands.warn.limitUses;
	if (reachedLimit) {
		const strings = {
			title: localise(client, 'warn.strings.limitReached.title', defaultLocale)(),
			description: localise(client, 'warn.strings.limitReached.description', defaultLocale)(
				{
					'mention_user': diagnosticMentionUser(member.user!),
					'limit': configuration.commands.warn.limitUses,
				},
			),
		};

		return void sendMessage(bot, moderationChannelId, {
			embeds: [{
				title: `${constants.symbols.indicators.warning} ${strings.title}`,
				description: strings.description,
				color: constants.colors.yellow,
			}],
		});
	}
}

function displayError([client, bot]: [Client, Bot], interaction: Interaction): void {
	const strings = {
		title: localise(client, 'warn.strings.failed.title', interaction.locale)(),
		description: localise(client, 'warn.strings.failed.description', interaction.locale)(),
	};

	return void reply([client, bot], interaction, {
		embeds: [{
			title: strings.title,
			description: strings.description,
			color: constants.colors.red,
		}],
	});
}

export default command;
