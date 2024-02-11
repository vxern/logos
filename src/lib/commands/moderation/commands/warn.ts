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
import { User } from "../../../database/user";
import { Rule, Warning } from "../../../database/warning";
import diagnostics from "../../../diagnostics";
import { parseArguments, reply, respond } from "../../../interactions";
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

async function handleWarnUserAutocomplete(client: Client, interaction: Logos.Interaction): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const session = client.database.openSession();

	const guildDocument =
		client.documents.guilds.get(guildId.toString()) ??
		(await session.get<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.moderation.features?.warns;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user, rule: ruleOrUndefined }, focused] = parseArguments(interaction.data?.options, {});

	if (focused?.name === "user") {
		if (user === undefined) {
			return;
		}

		client.autocompleteMembers(interaction, {
			identifier: user,
			options: {
				restrictToNonSelf: true,
				excludeModerators: true,
			},
		});

		return;
	}

	if (focused?.name === "rule") {
		if (ruleOrUndefined === undefined) {
			return;
		}

		const locale = interaction.locale;

		const strings = {
			other: client.localise("warn.options.rule.strings.other", locale)(),
		};

		const ruleQueryRaw = ruleOrUndefined ?? "";

		const ruleQueryTrimmed = ruleQueryRaw.trim();
		const ruleQueryLowercase = ruleQueryTrimmed.toLowerCase();
		const choices = [
			...rules
				.map((rule, index) => {
					return {
						name: getRuleTitleFormatted(client, rule, index, "option", { locale }),
						value: rule,
					};
				})
				.filter((choice) => choice.name.toLowerCase().includes(ruleQueryLowercase)),
			{ name: strings.other, value: components.none },
		];

		respond(client, interaction, choices);

		return;
	}
}

async function handleWarnUser(client: Client, interaction: Logos.Interaction): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	let session = client.database.openSession();

	const guildDocument =
		client.documents.guilds.get(guildId.toString()) ??
		(await session.get<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.moderation.features?.warns;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ user: userSearchQuery, rule, reason }] = parseArguments(interaction.data?.options, {});
	if (userSearchQuery === undefined || rule === undefined || reason === undefined) {
		return;
	}

	if (rule !== components.none && !(rules as string[]).includes(rule)) {
		const strings = {
			title: client.localise("warn.strings.invalidRule.title", locale)(),
			description: client.localise("warn.strings.invalidRule.description", locale)(),
		};

		reply(client, interaction, {
			embeds: [{ title: strings.title, description: strings.description, color: constants.colors.red }],
		});

		return;
	}

	const member = client.resolveInteractionToMember(
		interaction,
		{
			identifier: userSearchQuery,
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

	if (reason.length === 0) {
		displayError(client, interaction, { locale });
		return;
	}

	session = client.database.openSession();

	const [authorDocument, targetDocument] = [
		client.documents.users.get(interaction.user.id.toString()) ??
			(await session.get<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
			(await (async () => {
				const userDocument = {
					...({
						id: `users/${interaction.user.id}`,
						account: { id: interaction.user.id.toString() },
						createdAt: Date.now(),
					} satisfies User),
					"@metadata": { "@collection": "Users" },
				};
				await session.set(userDocument);
				await session.saveChanges();

				return userDocument as User;
			})()),
		client.documents.users.get(member.id.toString()) ??
			(await session.get<User>(`users/${member.id}`).then((value) => value ?? undefined)) ??
			(await (async () => {
				const userDocument = {
					...({
						id: `users/${member.id}`,
						account: { id: member.id.toString() },
						createdAt: Date.now(),
					} satisfies User),
					"@metadata": { "@collection": "Users" },
				};
				await session.set(userDocument);
				await session.saveChanges();

				return userDocument as User;
			})()),
	];

	session.dispose();

	if (authorDocument === undefined || targetDocument === undefined) {
		displayError(client, interaction, { locale });
		return;
	}

	const warningDocumentsCached = client.documents.warningsByTarget.get(targetDocument.account.id);

	session = client.database.openSession();

	const createdAt = Date.now();
	const warningDocument = {
		id: `warnings/${targetDocument.account.id}/${authorDocument.account.id}/${createdAt}`,
		authorId: authorDocument.account.id,
		targetId: targetDocument.account.id,
		rule: rule === components.none ? undefined : (rule as Rule),
		reason,
		createdAt,
		"@metadata": { "@collection": "Warnings" },
	};
	await session.set(warningDocument);
	await session.saveChanges();

	const warningDocuments =
		warningDocumentsCached !== undefined
			? Array.from(warningDocumentsCached.values())
			: await session
					.query<Warning>({ collection: "Warnings" })
					.whereStartsWith("id", `warnings/${targetDocument.account.id}`)
					.all()
					.then((warningDocuments) => {
						const map = new Map(
							warningDocuments.map((warningDocument) => [
								`${warningDocument.targetId}/${warningDocument.authorId}/${warningDocument.createdAt}`,
								warningDocument,
							]),
						);
						client.documents.warningsByTarget.set(member.id.toString(), map);
						return warningDocuments;
					});

	session.dispose();

	if (configuration.journaling) {
		const journallingService = client.getJournallingService(guild.id);
		journallingService?.log("memberWarnAdd", { args: [member, warningDocument, interaction.user] });
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

	reply(client, interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
			},
		],
	});

	const alertService = client.getAlertService(guild.id);

	const surpassedLimit = relevantWarnings.length > configuration.limit;
	if (surpassedLimit) {
		let strings: { title: string; description: string };
		if (configuration.autoTimeout.enabled) {
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

		alertService?.alert({
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

		alertService?.alert({
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
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("warn.strings.failed.title", locale)(),
		description: client.localise("warn.strings.failed.description", locale)(),
	};

	reply(client, interaction, {
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
