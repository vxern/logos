import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import components from "../../../../constants/types/components";
import defaults from "../../../../defaults";
import { MentionTypes, mention } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { timeStructToMilliseconds } from "../../../database/guild";
import { Guild } from "../../../database/guild";
import { Rule, Warning } from "../../../database/warning";
import diagnostics from "../../../diagnostics";
import { CommandTemplate } from "../../command";
import { reason, user } from "../../parameters";
import { getActiveWarnings } from "../module";
import { getRuleTitleFormatted, rules } from "./rule";

const command: CommandTemplate = {
	id: "warn",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	handle: handleWarnUser,
	handleAutocomplete: handleWarnUserAutocomplete,
	options: [
		user,
		{
			id: "rule",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
			autocomplete: true,
		},
		reason,
	],
};

async function handleWarnUserAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; rule: string; reason: string }>,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.warns;
	if (configuration === undefined) {
		return;
	}

	if (interaction.parameters.focused === undefined) {
		return;
	}

	switch (interaction.parameters.focused) {
		case "user": {
			client.autocompleteMembers(interaction, {
				identifier: interaction.parameters.user,
				options: {
					restrictToNonSelf: true,
					excludeModerators: true,
				},
			});
			break;
		}
		case "rule": {
			const locale = interaction.locale;

			const strings = {
				other: client.localise("warn.options.rule.strings.other", locale)(),
			};

			const ruleLowercase = interaction.parameters.rule.trim().toLowerCase();
			const choices = [
				...rules
					.map((rule, index) => {
						return {
							name: getRuleTitleFormatted(client, rule, index, "option", { locale }),
							value: rule,
						};
					})
					.filter((choice) => choice.name.toLowerCase().includes(ruleLowercase)),
				{ name: strings.other, value: components.none },
			];

			client.respond(interaction, choices);
			break;
		}
	}
}

async function handleWarnUser(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; rule: string; reason: string }>,
): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.warns;
	if (configuration === undefined) {
		return;
	}

	if (interaction.parameters.rule !== components.none && !(rules as string[]).includes(interaction.parameters.rule)) {
		const strings = {
			title: client.localise("warn.strings.invalidRule.title", locale)(),
			description: client.localise("warn.strings.invalidRule.description", locale)(),
		};

		client.reply(interaction, {
			embeds: [{ title: strings.title, description: strings.description, color: constants.colors.red }],
		});

		return;
	}

	const member = client.resolveInteractionToMember(
		interaction,
		{
			identifier: interaction.parameters.user,
			options: {
				restrictToNonSelf: true,
				excludeModerators: true,
			},
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

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const moderatorRoleIds = guild.roles
		.array()
		.filter((role) => role.permissions.has("MODERATE_MEMBERS"))
		.map((role) => role.id);
	if (moderatorRoleIds.length === 0) {
		return undefined;
	}

	// TODO(vxern): Test this.
	const [warningDocuments, warningDocument] = await Promise.all([
		Warning.getAll(client, { where: { targetId: member.id.toString() } }),
		Warning.create(client, {
			authorId: interaction.user.id.toString(),
			targetId: member.id.toString(),
			reason: interaction.parameters.reason,
			rule: interaction.parameters.rule === components.none ? undefined : (interaction.parameters.rule as Rule),
		}),
	]);

	if (configuration.journaling && guildDocument.isEnabled("journalling")) {
		const journallingService = client.getJournallingService(guild.id);
		journallingService?.logEvent("memberWarnAdd", { args: [member, warningDocument, interaction.user] });
	}

	const expirationMilliseconds = timeStructToMilliseconds(configuration.expiration ?? defaults.WARN_EXPIRY);

	const relevantWarnings = getActiveWarnings(warningDocuments, expirationMilliseconds);

	const strings = {
		title: client.localise("warn.strings.warned.title", locale)(),
		description: client.localise(
			"warn.strings.warned.description",
			locale,
		)({
			user_mention: mention(member.id, MentionTypes.User),
			warnings: client.pluralise("warn.strings.warned.description.warnings", language, relevantWarnings.length),
		}),
	};

	client.reply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
			},
		],
	});

	const surpassedLimit = relevantWarnings.length > configuration.limit;
	if (surpassedLimit) {
		let strings: { title: string; description: string };
		if (configuration.autoTimeout?.enabled) {
			const timeout = configuration.autoTimeout.duration ?? defaults.WARN_TIMEOUT;

			const language = interaction.guildLanguage;
			const locale = interaction.guildLocale;
			strings = {
				title: client.localise("warn.strings.limitSurpassedTimedOut.title", locale)(),
				description: client.localise(
					"warn.strings.limitSurpassedTimedOut.description",
					locale,
				)({
					user_mention: mention(user.id, MentionTypes.User),
					limit: configuration.limit,
					number: relevantWarnings.length,
					period: client.pluralise(`units.${timeout[1]}.word`, language, timeout[0]),
				}),
			};

			const timeoutMilliseconds = timeStructToMilliseconds(timeout);

			client.bot.rest
				.editMember(guild.id, member.id, {
					communicationDisabledUntil: new Date(Date.now() + timeoutMilliseconds).toISOString(),
				})
				.catch(() => client.log.warn(`Failed to edit timeout state of ${diagnostics.display.member(member)}.`));
		} else {
			const locale = interaction.guildLocale;
			strings = {
				title: client.localise("warn.strings.limitSurpassed.title", locale)(),
				description: client.localise(
					"warn.strings.limitSurpassed.description",
					locale,
				)({
					user_mention: mention(user.id, MentionTypes.User),
					limit: configuration.limit,
					number: relevantWarnings.length,
				}),
			};
		}

		if (guildDocument.areEnabled("alerts")) {
			const alertService = client.getAlertService(guild.id);
			alertService?.alert({
				embeds: [
					{
						title: `${constants.symbols.indicators.exclamation} ${strings.title}`,
						description: strings.description,
						color: constants.colors.red,
					},
				],
			});
		}

		return;
	}

	const reachedLimit = relevantWarnings.length === defaults.WARN_LIMIT;
	if (reachedLimit) {
		const locale = interaction.guildLocale;
		const strings = {
			title: client.localise("warn.strings.limitReached.title", locale)(),
			description: client.localise(
				"warn.strings.limitReached.description",
				locale,
			)({ user_mention: mention(user.id, MentionTypes.User), limit: defaults.WARN_LIMIT }),
		};

		if (guildDocument.areEnabled("alerts")) {
			const alertService = client.getAlertService(guild.id);
			alertService?.alert({
				embeds: [
					{
						title: `${constants.symbols.indicators.warning} ${strings.title}`,
						description: strings.description,
						color: constants.colors.yellow,
					},
				],
			});
		}

		return;
	}
}

async function displayError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("warn.strings.failed.title", locale)(),
		description: client.localise("warn.strings.failed.description", locale)(),
	};

	client.reply(interaction, {
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
