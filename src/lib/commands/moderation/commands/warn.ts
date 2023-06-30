import configuration from "../../../../configuration.js";
import constants from "../../../../constants.js";
import { MentionTypes, mention } from "../../../../formatting.js";
import { defaultLocale } from "../../../../types.js";
import { Client, autocompleteMembers, localise, resolveInteractionToMember } from "../../../client.js";
import { logEvent } from "../../../controllers/logging/logging.js";
import { parseArguments, reply } from "../../../interactions.js";
import { diagnosticMentionUser, getTextChannel } from "../../../utils.js";
import { CommandTemplate } from "../../command.js";
import { reason, user } from "../../parameters.js";
import { getActiveWarnings } from "../module.js";
import { ApplicationCommandTypes, Bot, Interaction, calculatePermissions, editMember, sendMessage } from "discordeno";

const command: CommandTemplate = {
	name: "warn",
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	handle: handleWarnUser,
	handleAutocomplete: handleWarnUserAutocomplete,
	options: [user, reason],
};

async function handleWarnUserAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	autocompleteMembers([client, bot], interaction, user, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
}

async function handleWarnUser([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user: userSearchQuery, reason }] = parseArguments(interaction.data?.options, {});
	if (userSearchQuery === undefined || reason === undefined) {
		return;
	}

	const member = resolveInteractionToMember([client, bot], interaction, userSearchQuery, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) {
		return;
	}

	const user = member.user;
	if (user === undefined) {
		return;
	}

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const moderatorRoleIds = guild.roles
		.array()
		.filter((role) => calculatePermissions(role.permissions).includes("MODERATE_MEMBERS"))
		.map((role) => role.id);
	if (moderatorRoleIds.length === 0) {
		return undefined;
	}

	if (reason.length === 0) {
		displayError([client, bot], interaction);
		return;
	}

	const [author, recipient] = await Promise.all([
		client.database.adapters.users.getOrFetchOrCreate(
			client,
			"id",
			interaction.user.id.toString(),
			interaction.user.id,
		),
		client.database.adapters.users.getOrFetchOrCreate(client, "id", member.id.toString(), member.id),
	]);

	if (author === undefined || recipient === undefined) {
		displayError([client, bot], interaction);
		return;
	}

	const [warnings, document] = await Promise.all([
		client.database.adapters.warnings.getOrFetch(client, "recipient", recipient.ref),
		client.database.adapters.warnings.create(client, {
			createdAt: Date.now(),
			author: author.ref,
			recipient: recipient.ref,
			reason,
		}),
	]);

	if (document !== undefined) {
		logEvent([client, bot], guild, "memberWarnAdd", [member, document.data, interaction.user]);
	}

	if (warnings === undefined || document === undefined) {
		displayError([client, bot], interaction);
		return;
	}

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
	if (moderationChannelId === undefined) {
		return;
	}

	const surpassedLimit = relevantWarnings.size > configuration.commands.warn.limitUses;
	if (surpassedLimit) {
		const strings = {
			title: localise(client, "warn.strings.limitSurpassed.title", defaultLocale)(),
			description: localise(
				client,
				"warn.strings.limitSurpassed.description",
				defaultLocale,
			)({
				user_mention: diagnosticMentionUser(user),
				limit: configuration.commands.warn.limitUses,
				number: relevantWarnings.size,
			}),
		};

		editMember(bot, guild.id, member.id, {
			communicationDisabledUntil: Date.now() + configuration.commands.warn.timeoutDuration,
		}).catch(() => client.log.warn(`Failed to edit timeout state of member with ID ${member.id}.`));

		sendMessage(bot, moderationChannelId, {
			embeds: [
				{
					title: `${constants.symbols.indicators.exclamation} ${strings.title}`,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		}).catch(() => client.log.warn("Failed to send message about the warning limit having been surpassed."));
		return;
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
				user_mention: diagnosticMentionUser(user),
				limit: configuration.commands.warn.limitUses,
			}),
		};

		sendMessage(bot, moderationChannelId, {
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

async function displayError([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const strings = {
		title: localise(client, "warn.strings.failed.title", interaction.locale)(),
		description: localise(client, "warn.strings.failed.description", interaction.locale)(),
	};

	reply([client, bot], interaction, {
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
