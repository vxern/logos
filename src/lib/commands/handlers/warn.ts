import { isValidRule } from "logos:constants/rules";
import diagnostics from "logos:core/diagnostics";
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
			const locale = interaction.locale;

			const strings = {
				other: client.localise("warn.options.rule.strings.other", locale)(),
			};

			const ruleLowercase = interaction.parameters.rule.trim().toLowerCase();
			const choices = [
				...constants.rules
					.map((rule) => {
						return {
							name: getRuleTitleFormatted(client, { rule, mode: "option" }, { locale }),
							value: rule,
						};
					})
					.filter((choice) => choice.name.toLowerCase().includes(ruleLowercase)),
				{ name: strings.other, value: constants.components.none },
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

	if (interaction.parameters.rule !== constants.components.none && !isValidRule(interaction.parameters.rule)) {
		const strings = {
			title: client.localise("warn.strings.invalidRule.title", locale)(),
			description: client.localise("warn.strings.invalidRule.description", locale)(),
		};

		await client.error(interaction, {
			title: strings.title,
			description: strings.description,
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
	const warningDocument = await Warning.create(client, {
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
		timeRangeMilliseconds: timeStructToMilliseconds(configuration.expiration ?? constants.defaults.WARN_EXPIRY),
	});

	const strings = {
		title: client.localise("warn.strings.warned.title", locale)(),
		description: client.localise(
			"warn.strings.warned.description",
			locale,
		)({
			user_mention: mention(member.id, { type: "user" }),
			warnings: client.pluralise("warn.strings.warned.description.warnings", locale, {
				quantity: warningDocumentsActive.length,
			}),
		}),
	};

	await client.success(interaction, {
		title: strings.title,
		description: strings.description,
	});

	const surpassedLimit = warningDocumentsActive.length > configuration.limit;
	if (surpassedLimit) {
		let strings: { title: string; description: string };
		if (configuration.autoTimeout?.enabled) {
			const timeout = configuration.autoTimeout.duration ?? constants.defaults.WARN_TIMEOUT;

			const locale = interaction.guildLocale;
			strings = {
				title: client.localise("warn.strings.limitSurpassedTimedOut.title", locale)(),
				description: client.localise(
					"warn.strings.limitSurpassedTimedOut.description",
					locale,
				)({
					user_mention: mention(user.id, { type: "user" }),
					limit: configuration.limit,
					number: warningDocumentsActive.length,
					period: client.pluralise(`units.${timeout[1]}.word`, locale, { quantity: timeout[0] }),
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
					user_mention: mention(user.id, { type: "user" }),
					limit: configuration.limit,
					number: warningDocumentsActive.length,
				}),
			};
		}

		if (guildDocument.areEnabled("alerts")) {
			const alertService = client.getAlertService(guild.id);
			alertService?.alert({
				embeds: [
					{
						title: `${constants.emojis.indicators.exclamation} ${strings.title}`,
						description: strings.description,
						color: constants.colours.red,
					},
				],
			});
		}

		return;
	}

	const reachedLimit = warningDocumentsActive.length === constants.defaults.WARN_LIMIT;
	if (reachedLimit) {
		const locale = interaction.guildLocale;
		const strings = {
			title: client.localise("warn.strings.limitReached.title", locale)(),
			description: client.localise(
				"warn.strings.limitReached.description",
				locale,
			)({ user_mention: mention(user.id, { type: "user" }), limit: constants.defaults.WARN_LIMIT }),
		};

		if (guildDocument.areEnabled("alerts")) {
			const alertService = client.getAlertService(guild.id);
			alertService?.alert({
				embeds: [
					{
						title: `${constants.emojis.indicators.warning} ${strings.title}`,
						description: strings.description,
						color: constants.colours.yellow,
					},
				],
			});
		}

		return;
	}
}

export { handleWarnUser, handleWarnUserAutocomplete };
