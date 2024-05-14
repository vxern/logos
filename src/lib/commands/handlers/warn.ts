import { isValidRule } from "logos:constants/rules";
import { mention } from "logos:core/formatting";
import { Client } from "logos/client";
import { getRuleTitleFormatted } from "logos/commands/rules";
import { timeStructToMilliseconds } from "logos/database/guild";
import { Guild } from "logos/database/guild";
import { Warning } from "logos/database/warning";

async function handleWarnUserAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; rule: string; reason: string }>,
): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.warns;
	if (configuration === undefined) {
		return;
	}

	if (interaction.parameters.focused === undefined) {
		return;
	}

	switch (interaction.parameters.focused) {
		case "user": {
			await client.autocompleteMembers(interaction, {
				identifier: interaction.parameters.user,
				options: {
					restrictToNonSelf: true,
					excludeModerators: true,
				},
			});
			break;
		}
		case "rule": {
			const strings = constants.contexts.otherRuleOption({
				localise: client.localise.bind(client),
				locale: interaction.locale,
			});
			const ruleLowercase = interaction.parameters.rule.trim().toLowerCase();
			const choices = [
				...constants.rules
					.map((rule) => {
						return {
							name: getRuleTitleFormatted(client, interaction, { rule, mode: "option" }),
							value: rule,
						};
					})
					.filter((choice) => choice.name.toLowerCase().includes(ruleLowercase)),
				{ name: strings.option, value: constants.components.none },
			];

			await client.respond(interaction, choices);
			break;
		}
	}
}

async function handleWarnUser(
	client: Client,
	interaction: Logos.Interaction<any, { user: string; rule: string; reason: string }>,
): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.warns;
	if (configuration === undefined) {
		return;
	}

	if (interaction.parameters.rule !== constants.components.none && !isValidRule(interaction.parameters.rule)) {
		const strings = constants.contexts.invalidRule({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});
		await client.error(interaction, {
			title: strings.title,
			description: strings.description,
		});
		return;
	}

	const member = client.resolveInteractionToMember(interaction, {
		identifier: interaction.parameters.user,
		options: {
			restrictToNonSelf: true,
			excludeModerators: true,
		},
	});
	if (member === undefined) {
		return;
	}

	const user = member.user;
	if (user === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(interaction.guildId);
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

	const warningDocument = await Warning.create(client, {
		guildId: interaction.guildId.toString(),
		authorId: interaction.user.id.toString(),
		targetId: member.id.toString(),
		reason: interaction.parameters.reason,
		rule: interaction.parameters.rule === constants.components.none ? undefined : interaction.parameters.rule,
	});

	await client.tryLog("memberWarnAdd", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [member, warningDocument, interaction.user],
	});

	const warningDocumentsActive = await Warning.getActiveWarnings(client, {
		guildId: interaction.guildId.toString(),
		targetId: member.id.toString(),
		timeRangeMilliseconds: timeStructToMilliseconds(configuration.expiration ?? constants.defaults.WARN_EXPIRY),
	});

	const strings = constants.contexts.userWarned({
		localise: client.localise.bind(client),
		locale: interaction.locale,
	});

	await client.success(interaction, {
		title: strings.title,
		description: strings.description({
			user_mention: mention(member.id, { type: "user" }),
			warnings: client.pluralise("warn.strings.warned.description.warnings", interaction.locale, {
				quantity: warningDocumentsActive.length,
			}),
		}),
	});

	const surpassedLimit = warningDocumentsActive.length > configuration.limit;
	if (surpassedLimit) {
		if (guildDocument.areEnabled("alerts")) {
			const alertService = client.getAlertService(guild.id);
			if (configuration.autoTimeout?.enabled) {
				const timeout = configuration.autoTimeout.duration ?? constants.defaults.WARN_TIMEOUT;
				const timeoutMilliseconds = timeStructToMilliseconds(timeout);

				client.bot.rest
					.editMember(guild.id, member.id, {
						communicationDisabledUntil: new Date(Date.now() + timeoutMilliseconds).toISOString(),
					})
					.catch(() =>
						client.log.warn(`Failed to edit timeout state of ${client.diagnostics.member(member)}.`),
					);

				const strings = constants.contexts.warningLimitSurpassedAndTimedOut({
					localise: client.localise.bind(client),
					locale: interaction.guildLocale,
				});
				alertService?.alert({
					embeds: [
						{
							title: `${constants.emojis.indicators.exclamation} ${strings.title}`,
							description: strings.description({
								user_mention: mention(user.id, { type: "user" }),
								limit: configuration.limit,
								number: warningDocumentsActive.length,
								period: client.pluralise(`units.${timeout[1]}.word`, interaction.guildLocale, {
									quantity: timeout[0],
								}),
							}),
							color: constants.colours.red,
						},
					],
				});
			} else {
				const strings = constants.contexts.warningLimitSurpassed({
					localise: client.localise.bind(client),
					locale: interaction.guildLocale,
				});
				alertService?.alert({
					embeds: [
						{
							title: `${constants.emojis.indicators.exclamation} ${strings.title}`,
							description: strings.description({
								user_mention: mention(user.id, { type: "user" }),
								limit: configuration.limit,
								number: warningDocumentsActive.length,
							}),
							color: constants.colours.red,
						},
					],
				});
			}
		}

		return;
	}

	const reachedLimit = warningDocumentsActive.length === constants.defaults.WARN_LIMIT;
	if (reachedLimit) {
		const strings = constants.contexts.limitReached({
			localise: client.localise.bind(client),
			locale: interaction.guildLocale,
		});
		if (guildDocument.areEnabled("alerts")) {
			const alertService = client.getAlertService(guild.id);
			alertService?.alert({
				embeds: [
					{
						title: `${constants.emojis.indicators.warning} ${strings.title}`,
						description: strings.description({
							user_mention: mention(user.id, { type: "user" }),
							limit: constants.defaults.WARN_LIMIT,
						}),
						color: constants.colours.yellow,
					},
				],
			});
		}

		return;
	}
}

export { handleWarnUser, handleWarnUserAutocomplete };
