import { ApplicationCommandTypes, Bot, calculatePermissions, editMember, Interaction, sendMessage } from "discordeno";
import { getActiveWarnings } from "../module.js";
import { CommandTemplate } from "../../command.js";
import { reason, user } from "../../parameters.js";
import { logEvent } from "../../../controllers/logging/logging.js";
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from "../../../client.js";
import { parseArguments, reply } from "../../../interactions.js";
import { diagnosticMentionUser, getTextChannel } from "../../../utils.js";
import configuration from "../../../../configuration.js";
import constants from "../../../../constants.js";
import { mention, MentionTypes } from "../../../../formatting.js";
import { defaultLocale } from "../../../../types.js";

const command: CommandTemplate = {
	name: "warn",
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	handle: handleWarnUser,
	handleAutocomplete: handleWarnUserAutocomplete,
	options: [user, reason],
};

function handleWarnUserAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): void {
	const [{ user }] = parseArguments(interaction.data?.options, {});

	return autocompleteMembers([client, bot], interaction, user!, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
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

	const moderatorRoleIds = guild.roles
		.array()
		.filter((role) => calculatePermissions(role.permissions).includes("MODERATE_MEMBERS"))
		.map((role) => role.id);
	if (moderatorRoleIds.length === 0) return undefined;

	if (reason!.length === 0) return displayError([client, bot], interaction);

	const [author, recipient] = await Promise.all([
		client.database.adapters.users.getOrFetchOrCreate(
			client,
			"id",
			interaction.user.id.toString(),
			interaction.user.id,
		),
		client.database.adapters.users.getOrFetchOrCreate(client, "id", member.id.toString(), member.id),
	]);

	if (author === undefined || recipient === undefined) return displayError([client, bot], interaction);

	const [warnings, document] = await Promise.all([
		client.database.adapters.warnings.getOrFetch(client, "recipient", recipient.ref),
		client.database.adapters.warnings.create(client, {
			createdAt: Date.now(),
			author: author.ref,
			recipient: recipient.ref,
			reason: reason!,
		}),
	]);

	if (document !== undefined) {
		logEvent([client, bot], guild, "memberWarnAdd", [member, document.data, interaction.user]);
	}

	if (warnings === undefined || document === undefined) return displayError([client, bot], interaction);

	const relevantWarnings = getActiveWarnings(warnings);

	const strings = {
		title: localise(client, "warn.strings.warned.title", interaction.locale)(),
		description: localise(
			client,
			"warn.strings.warned.description",
			interaction.locale,
		)({
			user_mention: mention(member.id, MentionTypes.User),
			number: relevantWarnings.size,
		}),
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
			},
		],
	});

	const moderationChannelId = getTextChannel(guild, configuration.guilds.channels.guideChat)?.id;
	if (moderationChannelId === undefined) return;

	const surpassedLimit = relevantWarnings.size > configuration.commands.warn.limitUses;
	if (surpassedLimit) {
		const strings = {
			title: localise(client, "warn.strings.limitSurpassed.title", defaultLocale)(),
			description: localise(
				client,
				"warn.strings.limitSurpassed.description",
				defaultLocale,
			)({
				user_mention: diagnosticMentionUser(member.user!),
				limit: configuration.commands.warn.limitUses,
				number: relevantWarnings.size,
			}),
		};

		editMember(bot, guild.id, member.id, {
			communicationDisabledUntil: Date.now() + configuration.commands.warn.timeoutDuration,
		}).catch(() => client.log.warn(`Failed to edit timeout state of member with ID ${member.id}.`));

		return void sendMessage(bot, moderationChannelId, {
			embeds: [
				{
					title: `${constants.symbols.indicators.exclamation} ${strings.title}`,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		}).catch(() => client.log.warn("Failed to send message about the warning limit having been surpassed."));
	}

	const reachedLimit = relevantWarnings.size === configuration.commands.warn.limitUses;
	if (reachedLimit) {
		const strings = {
			title: localise(client, "warn.strings.limitReached.title", defaultLocale)(),
			description: localise(
				client,
				"warn.strings.limitReached.description",
				defaultLocale,
			)({
				user_mention: diagnosticMentionUser(member.user!),
				limit: configuration.commands.warn.limitUses,
			}),
		};

		return void sendMessage(bot, moderationChannelId, {
			embeds: [
				{
					title: `${constants.symbols.indicators.warning} ${strings.title}`,
					description: strings.description,
					color: constants.colors.yellow,
				},
			],
		}).catch(() => client.log.warn("Failed to send message about the warning limit having been reached."));
	}
}

function displayError([client, bot]: [Client, Bot], interaction: Interaction): void {
	const strings = {
		title: localise(client, "warn.strings.failed.title", interaction.locale)(),
		description: localise(client, "warn.strings.failed.description", interaction.locale)(),
	};

	return void reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

export default command;
