import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { MentionTypes, mention } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, autocompleteMembers, localise, pluralise, resolveInteractionToMember } from "../../../client";
import { timeStructToMilliseconds } from "../../../database/structs/guild";
import diagnostics from "../../../diagnostics";
import { parseArguments, reply } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { reason, user } from "../../parameters";
import { getActiveWarnings } from "../module";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "warn",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	handle: handleWarnUser,
	handleAutocomplete: handleWarnUserAutocomplete,
	options: [user, reason],
};

async function handleWarnUserAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) {
		return;
	}

	autocompleteMembers([client, bot], interaction, user, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
}

async function handleWarnUser([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetchOrCreate(
		client,
		"id",
		guildId.toString(),
		guildId,
	);
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.data.features.moderation.features?.warns;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user: userSearchQuery, reason }] = parseArguments(interaction.data?.options, {});
	if (userSearchQuery === undefined || reason === undefined) {
		return;
	}

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		userSearchQuery,
		{
			restrictToNonSelf: true,
			excludeModerators: true,
		},
		{ locale },
	);
	if (member === undefined) {
		return;
	}

	const user = member.user;
	if (user === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const moderatorRoleIds = guild.roles
		.array()
		.filter((role) => Discord.calculatePermissions(role.permissions).includes("MODERATE_MEMBERS"))
		.map((role) => role.id);
	if (moderatorRoleIds.length === 0) {
		return undefined;
	}

	if (reason.length === 0) {
		displayError([client, bot], interaction, { locale });
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
		displayError([client, bot], interaction, { locale });
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

	if (configuration.journaling && document !== undefined) {
		const journallingService = client.services.journalling.get(guild.id);
		journallingService?.log(bot, "memberWarnAdd", { args: [member, document.data, interaction.user] });
	}

	if (warnings === undefined || document === undefined) {
		displayError([client, bot], interaction, { locale });
		return;
	}

	const expirationMilliseconds = timeStructToMilliseconds(configuration.expiration ?? defaults.WARN_EXPIRY);

	const relevantWarnings = getActiveWarnings(warnings, expirationMilliseconds);

	const strings = {
		title: localise(client, "warn.strings.warned.title", locale)(),
		description: localise(
			client,
			"warn.strings.warned.description",
			locale,
		)({
			user_mention: mention(member.id, MentionTypes.User),
			warnings: pluralise(client, "warn.strings.warned.description.warnings", language, relevantWarnings.size),
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

	const alertService = client.services.alerts.get(guild.id);

	const surpassedLimit = relevantWarnings.size > configuration.limit;
	if (surpassedLimit) {
		let strings;
		if (configuration.autoTimeout.enabled) {
			const timeout = configuration.autoTimeout.duration ?? defaults.WARN_TIMEOUT;

			const language = interaction.guildLanguage;
			const locale = interaction.guildLocale;
			strings = {
				title: localise(client, "warn.strings.limitSurpassedTimedOut.title", locale)(),
				description: localise(
					client,
					"warn.strings.limitSurpassedTimedOut.description",
					locale,
				)({
					user_mention: diagnostics.display.user(user),
					limit: configuration.limit,
					number: relevantWarnings.size,
					period: pluralise(client, `units.${timeout[1]}.word`, language, timeout[0]),
				}),
			};

			const timeoutMilliseconds = timeStructToMilliseconds(timeout);

			Discord.editMember(bot, guild.id, member.id, {
				communicationDisabledUntil: Date.now() + timeoutMilliseconds,
			}).catch(() => client.log.warn(`Failed to edit timeout state of ${diagnostics.display.member(member)}.`));
		} else {
			const locale = interaction.guildLocale;
			strings = {
				title: localise(client, "warn.strings.limitSurpassed.title", locale)(),
				description: localise(
					client,
					"warn.strings.limitSurpassed.description",
					locale,
				)({ user_mention: diagnostics.display.user(user), limit: configuration.limit, number: relevantWarnings.size }),
			};
		}

		alertService?.alert(bot, {
			embeds: [
				{
					title: `${constants.symbols.indicators.exclamation} ${strings.title}`,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});

		return;
	}

	const reachedLimit = relevantWarnings.size === defaults.WARN_LIMIT;
	if (reachedLimit) {
		const locale = interaction.guildLocale;
		const strings = {
			title: localise(client, "warn.strings.limitReached.title", locale)(),
			description: localise(
				client,
				"warn.strings.limitReached.description",
				locale,
			)({ user_mention: diagnostics.display.user(user), limit: defaults.WARN_LIMIT }),
		};

		alertService?.alert(bot, {
			embeds: [
				{
					title: `${constants.symbols.indicators.warning} ${strings.title}`,
					description: strings.description,
					color: constants.colors.yellow,
				},
			],
		});

		return;
	}
}

async function displayError(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: localise(client, "warn.strings.failed.title", locale)(),
		description: localise(client, "warn.strings.failed.description", locale)(),
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
