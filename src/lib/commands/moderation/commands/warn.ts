import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import defaults from "../../../../defaults";
import { MentionTypes, mention } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, autocompleteMembers, localise, pluralise, resolveInteractionToMember } from "../../../client";
import { timeStructToMilliseconds } from "../../../database/guild";
import diagnostics from "../../../diagnostics";
import { parseArguments, reply } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { reason, user } from "../../parameters";
import { getActiveWarnings } from "../module";
import { Guild } from "../../../database/guild";
import { User } from "../../../database/user";
import { Warning } from "../../../database/warning";

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

	const session = client.database.openSession();

	const guildDocument =
		client.cache.documents.guilds.get(guildId.toString()) ??
		(await session.load<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.moderation.features?.warns;
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
		.filter((role) => role.permissions.has("MODERATE_MEMBERS"))
		.map((role) => role.id);
	if (moderatorRoleIds.length === 0) {
		return undefined;
	}

	if (reason.length === 0) {
		displayError([client, bot], interaction, { locale });
		return;
	}

	const [authorDocument, targetDocument] = [
		client.cache.documents.users.get(interaction.user.id.toString()) ??
			(await session.load<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
			(await (async () => {
				const userDocument = {
					...({
						id: `users/${interaction.user.id}`,
						account: { id: interaction.user.id.toString() },
						createdAt: Date.now(),
					} satisfies User),
					"@metadata": { "@collection": "Users" },
				};
				await session.store(userDocument);
				await session.saveChanges();

				return userDocument as User;
			})()),
		client.cache.documents.users.get(member.id.toString()) ??
			(await session.load<User>(`users/${member.id}`).then((value) => value ?? undefined)) ??
			(await (async () => {
				const userDocument = {
					...({
						id: `users/${member.id}`,
						account: { id: member.id.toString() },
						createdAt: Date.now(),
					} satisfies User),
					"@metadata": { "@collection": "Users" },
				};
				await session.store(userDocument);
				await session.saveChanges();

				return userDocument as User;
			})()),
	];

	if (authorDocument === undefined || targetDocument === undefined) {
		displayError([client, bot], interaction, { locale });
		return;
	}

	const warningDocumentsCached = client.cache.documents.warningsByTarget.get(targetDocument.account.id);

	const createdAt = Date.now();
	const warningDocument = {
		id: `warnings/${targetDocument.account.id}/${authorDocument.account.id}/${createdAt}`,
		authorId: authorDocument.account.id,
		targetId: targetDocument.account.id,
		reason,
		createdAt,
		"@metadata": { "@collection": "Warnings" },
	};
	await session.store(warningDocument);
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
						client.cache.documents.warningsByTarget.set(member.id.toString(), map);
						return warningDocuments;
					});

	if (configuration.journaling) {
		const journallingService = client.services.journalling.get(guild.id);
		journallingService?.log("memberWarnAdd", { args: [member, warningDocument, interaction.user] });
	}

	const expirationMilliseconds = timeStructToMilliseconds(configuration.expiration ?? defaults.WARN_EXPIRY);

	const relevantWarnings = getActiveWarnings(warningDocuments, expirationMilliseconds);

	const strings = {
		title: localise(client, "warn.strings.warned.title", locale)(),
		description: localise(
			client,
			"warn.strings.warned.description",
			locale,
		)({
			user_mention: mention(member.id, MentionTypes.User),
			warnings: pluralise(client, "warn.strings.warned.description.warnings", language, relevantWarnings.length),
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

	const surpassedLimit = relevantWarnings.length > configuration.limit;
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
					user_mention: mention(user.id, MentionTypes.User),
					limit: configuration.limit,
					number: relevantWarnings.length,
					period: pluralise(client, `units.${timeout[1]}.word`, language, timeout[0]),
				}),
			};

			const timeoutMilliseconds = timeStructToMilliseconds(timeout);

			bot.rest
				.editMember(guild.id, member.id, {
					// TODO(vxern): This is a Discordeno monkey-patch. Remove once fixed in Discordeno.
					// @ts-ignore
					communicationDisabledUntil: new Date(Date.now() + timeoutMilliseconds).toISOString(),
				})
				.catch(() => client.log.warn(`Failed to edit timeout state of ${diagnostics.display.member(member)}.`));
		} else {
			const locale = interaction.guildLocale;
			strings = {
				title: localise(client, "warn.strings.limitSurpassed.title", locale)(),
				description: localise(
					client,
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
			title: localise(client, "warn.strings.limitReached.title", locale)(),
			description: localise(
				client,
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
