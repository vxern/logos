import {
	Bot,
	ButtonStyles,
	CreateMessage,
	deleteMessage,
	getAvatarURL,
	Guild,
	InteractionTypes,
	Message,
	MessageComponentTypes,
	sendMessage,
	User as DiscordUser,
} from 'discordeno';
import { lodash } from 'lodash';
import { getWarningPage } from 'logos/src/commands/information/commands/list/warnings.ts';
import { Report, User, Warning } from 'logos/src/database/structs/mod.ts';
import { Document, Reference } from 'logos/src/database/document.ts';
import { stringifyValue } from 'logos/src/database/database.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client, extendEventHandler, localise, WithLanguage } from 'logos/src/client.ts';
import {
	createInteractionCollector,
	decodeId,
	encodeId,
	InteractionCollectorSettings,
	reply,
} from 'logos/src/interactions.ts';
import { diagnosticMentionUser, getAllMessages, getTextChannel } from 'logos/src/utils.ts';
import { defaultLocale } from 'logos/types.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes, timestamp } from 'logos/formatting.ts';

const reportPromptHandlers = new Map<string, NonNullable<InteractionCollectorSettings['onCollect']>>();

const service: ServiceStarter = ([client, bot]) => {
	setupActionHandler([client, bot]);
	registerPastReports([client, bot]);
	ensureReportPromptPersistence([client, bot]);
};

function setupActionHandler([client, bot]: [Client, Bot]): void {
	createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		customId: constants.staticComponentIds.reports,
		doesNotExpire: true,
		onCollect: (_, selection) => {
			const [__, authorId, guildId, reportReference, ___] = decodeId<ReportPromptButtonID>(selection.data!.customId!);

			const handle = reportPromptHandlers.get(
				[authorId, guildId, reportReference].join(constants.symbols.meta.idSeparator),
			);
			if (handle === undefined) return;

			return void handle(bot, selection);
		},
	});
}

interface ReportPromptMetadata {
	authorId: bigint;
	reportReferenceId: string;
}

function extractMetadata(prompt: Message): ReportPromptMetadata | undefined {
	const metadata = prompt.embeds.at(0)?.footer?.text;
	if (metadata === undefined) return undefined;

	const [authorId, reportReferenceId] = metadata.split(constants.symbols.meta.metadataSeparator);
	if (authorId === undefined || reportReferenceId === undefined) return undefined;

	return { authorId: BigInt(authorId), reportReferenceId: reportReferenceId };
}

function getValidPrompts(bot: Bot, prompts: Message[]): Message[] {
	return prompts.filter(
		(prompt) => {
			if (extractMetadata(prompt) === undefined) {
				deleteMessage(bot, prompt.channelId, prompt.id);
				return false;
			}

			return true;
		},
	);
}

const reportChannelIdByGuildId = new Map<bigint, bigint>();
const reportByMessageId = new Map<bigint, Document<Report>>();
const authorIdByMessageId = new Map<bigint, bigint>();
const messageIdByReportReferenceId = new Map<string, bigint>();

function registerPastReports([client, bot]: [Client, Bot]): void {
	const reportsByGuildId = new Map<bigint, Document<Report>[]>();
	{
		const reportsByAuthorAndGuild = Array.from(client.database.cache.reportsByAuthorAndGuild.values())
			.map((reports) => Array.from(reports.values()));

		for (const reports of reportsByAuthorAndGuild) {
			if (reports.length === 0) continue;

			const guildId = BigInt(reports[0]!.data.guild);

			if (!reportsByGuildId.has(guildId)) {
				reportsByGuildId.set(guildId, reports);
				continue;
			}

			reportsByGuildId.get(guildId)!.push(...reports);
		}
	}

	extendEventHandler(bot, 'guildCreate', { append: true }, async (bot, guild_) => {
		const guild = client.cache.guilds.get(guild_.id)!;

		const reportChannelId = getTextChannel(guild, configuration.guilds.channels.reports)?.id;
		if (reportChannelId === undefined) {
			client.log.error(
				`Failed to register previous reports on ${guild.name}: There is no report channel.`,
			);
			return;
		}

		reportChannelIdByGuildId.set(guild.id, reportChannelId);

		const reportPromptsAll = await getAllMessages([client, bot], reportChannelId) ?? [];
		const reportPrompts = getValidPrompts(bot, reportPromptsAll);
		const reportPromptsByAuthorId = new Map<bigint, Map<string, Message>>();

		for (const prompt of reportPrompts) {
			const { authorId, reportReferenceId } = extractMetadata(prompt)!;

			if (!reportPromptsByAuthorId.has(authorId)) {
				reportPromptsByAuthorId.set(authorId, new Map([[reportReferenceId, prompt]]));
				continue;
			}

			reportPromptsByAuthorId.get(authorId)!.set(reportReferenceId, prompt);
		}

		const reports = reportsByGuildId.get(guild.id) ?? [];

		for (const report of reports) {
			const authorReferenceId = BigInt(stringifyValue(report.data.author));

			const authorDocument = await client.database.adapters.users.getOrFetch(
				client,
				'reference',
				report.data.author,
			);
			if (authorDocument === undefined) {
				client.log.error(
					`Failed to register report submitted by user with reference ${authorReferenceId} to guild ${guild.name}: ` +
						`Could not get the user document.`,
				);
				continue;
			}

			const authorId = BigInt(authorDocument.data.account.id);
			const reportReferenceId = stringifyValue(report.ref);

			let messageId!: bigint;
			const prompt = reportPromptsByAuthorId.get(authorId)?.get(reportReferenceId);

			if (prompt === undefined) {
				const author = client.cache.users.get(authorId);
				if (author === undefined) {
					client.log.error(
						`Failed to register report submitted by user with ID ${authorId} to guild ${guild.name}: ` +
							`The user is not cached.`,
					);
					continue;
				}

				const recipients = await Promise.all(
					report.data.recipients.map((recipientReference) =>
						client.database.adapters.users.getOrFetch(client, 'reference', recipientReference)
					),
				).then((recipients) => recipients.includes(undefined) ? undefined : recipients as unknown as Document<User>[]);
				if (recipients === undefined) return;

				const recipientAndWarningsTuples = await getRecipientAndWarningsTuples(client, recipients);
				if (recipientAndWarningsTuples === undefined) return;

				messageId = await sendMessage(
					bot,
					reportChannelId,
					getReportPrompt([client, bot], guild, author, recipientAndWarningsTuples, report),
				).then((message) => message.id);
			} else {
				reportPromptsByAuthorId.get(authorId)!.delete(reportReferenceId);
				messageId = prompt.id;
			}

			reportByMessageId.set(messageId, report);
			authorIdByMessageId.set(messageId, authorId);
			messageIdByReportReferenceId.set(reportReferenceId, messageId);

			registerReportHandler(client, guild.id, reportChannelId, [authorId, authorDocument.ref], reportReferenceId);
		}

		// These are the prompts which aren't connected to any report.
		const remainingReportPrompts = Array.from(reportPromptsByAuthorId.values())
			.map((map) => Array.from(map.values()))
			.flat();
		for (const prompt of remainingReportPrompts) {
			deleteMessage(bot, prompt.channelId, prompt.id);
		}
	});
}

function ensureReportPromptPersistence([client, bot]: [Client, Bot]): void {
	// Anti-tampering feature; detects report prompts being deleted.
	extendEventHandler(bot, 'messageDelete', { prepend: true }, async (_, { id, channelId, guildId }) => {
		// If the message was deleted from any other channel apart from a report channel.
		if (reportChannelIdByGuildId.get(guildId!) !== channelId) {
			return;
		}

		const report = reportByMessageId.get(id);
		if (report === undefined) return;

		const authorId = authorIdByMessageId.get(id);
		if (authorId === undefined) return;

		const author = client.cache.users.get(authorId);
		if (author === undefined) return;

		const recipients = await Promise.all(
			report.data.recipients.map((recipientReference) =>
				client.database.adapters.users.getOrFetch(client, 'reference', recipientReference)
			),
		).then((recipients) => recipients.includes(undefined) ? undefined : recipients as unknown as Document<User>[]);
		if (recipients === undefined) return;

		const recipientAndWarningsTuples = await getRecipientAndWarningsTuples(client, recipients);
		if (recipientAndWarningsTuples === undefined) return;

		const guild = client.cache.guilds.get(guildId!)!;

		const newMessageId = await sendMessage(
			bot,
			channelId,
			getReportPrompt([client, bot], guild, author, recipientAndWarningsTuples, report),
		).then((message) => message.id);
		reportByMessageId.delete(id);
		authorIdByMessageId.delete(id);
		reportByMessageId.set(newMessageId, report);
		authorIdByMessageId.set(newMessageId, authorId);

		const reportReferenceId = stringifyValue(report.ref);

		messageIdByReportReferenceId.delete(reportReferenceId);
		messageIdByReportReferenceId.set(reportReferenceId, newMessageId);
	});

	// Anti-tampering feature; detects embeds being deleted from report prompts.
	extendEventHandler(bot, 'messageUpdate', { prepend: true }, (bot, { id, channelId, guildId, embeds }) => {
		// If the message was updated in any other channel apart from a report channel.
		if (reportChannelIdByGuildId.get(guildId!) !== channelId) {
			return;
		}

		// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
		if (embeds.length === 1) return;

		// Delete the message and allow the bot to handle the deletion.
		deleteMessage(bot, channelId, id);
	});
}

type RecipientAndWarningsTuple = [recipient: DiscordUser, warnings: Document<Warning>[]];

// deno-lint-ignore require-await
async function getRecipientAndWarningsTuples(
	client: Client,
	recipientDocuments: Document<User>[],
): Promise<RecipientAndWarningsTuple[] | undefined> {
	const promises: Promise<RecipientAndWarningsTuple>[] = [];
	for (const recipientDocument of recipientDocuments) {
		const recipient = client.cache.users.get(BigInt(recipientDocument.data.account.id));
		if (recipient === undefined) return undefined;

		const warningsPromise = client.database.adapters.warnings.getOrFetch(client, 'recipient', recipientDocument.ref);
		promises.push(
			new Promise((resolve, reject) =>
				warningsPromise.then((warnings) => {
					if (warnings === undefined) return void reject();
					return void resolve([recipient, Array.from(warnings.values())]);
				})
			),
		);
	}

	return Promise.all(promises).catch(() => undefined);
}

function registerReportHandler(
	client: Client,
	guildId: bigint,
	channelId: bigint,
	[authorId, authorReference]: [bigint, Reference],
	reportReferenceId: string,
): void {
	reportPromptHandlers.set(
		[authorId, guildId, reportReferenceId].join(constants.symbols.meta.idSeparator),
		async (bot, selection) => {
			const isResolved = decodeId<ReportPromptButtonID>(selection.data!.customId!)[4] === 'true';

			const reports = client.database.adapters.reports.get(client, 'authorAndGuild', [
				authorReference,
				guildId.toString(),
			]);
			if (reports === undefined) return;

			const report = reports.get(reportReferenceId.toString());
			if (report === undefined) return;

			if (isResolved && report.data.isResolved) {
				const strings = {
					title: localise(client, 'alreadyMarkedResolved.title', defaultLocale)(),
					description: localise(client, 'alreadyMarkedResolved.description', defaultLocale)(),
				};

				return void reply([client, bot], selection, {
					embeds: [{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					}],
				});
			}

			if (!isResolved && !report.data.isResolved) {
				const strings = {
					title: localise(client, 'alreadyMarkedUnresolved.title', defaultLocale)(),
					description: localise(client, 'alreadyMarkedUnresolved.description', defaultLocale)(),
				};

				return void reply([client, bot], selection, {
					embeds: [{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					}],
				});
			}

			const updatedReportContent = lodash.cloneDeep(report) as Document<Report>;

			updatedReportContent.data.isResolved = isResolved;

			const updatedReportDocument = await client.database.adapters.reports.update(client, updatedReportContent);
			if (updatedReportDocument === undefined) return;

			const messageId = messageIdByReportReferenceId.get(reportReferenceId);
			if (messageId === undefined) return;

			reportByMessageId.set(messageId, updatedReportDocument);

			deleteMessage(bot, channelId, messageId);

			return;
		},
	);
}

type ReportPromptButtonID = [authorId: string, guildId: string, reportReferenceId: string, isResolved: string];

function getReportPrompt(
	[client, bot]: [Client, Bot],
	guild: WithLanguage<Guild>,
	author: DiscordUser,
	recipientAndWarningsTuples: RecipientAndWarningsTuple[],
	reportDocument: Document<Report>,
): CreateMessage {
	const reportReferenceId = stringifyValue(reportDocument.ref);
	const report = reportDocument.data;

	const strings = {
		report: {
			submittedBy: localise(client, 'submittedBy', defaultLocale)(),
			submittedAt: localise(client, 'submittedAt', defaultLocale)(),
			users: localise(client, 'reports.users', defaultLocale)(),
			reason: localise(client, 'reports.reason', defaultLocale)(),
			link: localise(client, 'reports.link', defaultLocale)(),
			noLinkProvided: localise(client, 'reports.noLinkProvided', defaultLocale)(),
		},
		previousInfractions: {
			title: localise(client, 'reports.previousInfractions', defaultLocale),
		},
		markResolved: localise(client, 'markResolved', defaultLocale)(),
		markUnresolved: localise(client, 'markUnresolved', defaultLocale)(),
	};

	return {
		embeds: [
			{
				title: diagnosticMentionUser(author),
				color: constants.colors.darkRed,
				thumbnail: (() => {
					const iconURL = getAvatarURL(bot, author.id, author.discriminator, {
						avatar: author.avatar,
						size: 32,
						format: 'webp',
					});
					if (iconURL === undefined) return;

					return { url: iconURL };
				})(),
				fields: [
					{
						name: strings.report.submittedBy,
						value: mention(author.id, MentionTypes.User),
					},
					{
						name: strings.report.submittedAt,
						value: timestamp(reportDocument.data.createdAt),
					},
					{
						name: strings.report.users,
						value: recipientAndWarningsTuples.map(([recipient, _recipientWarnings]) =>
							mention(recipient.id, MentionTypes.User)
						).join(', '),
					},
					{
						name: strings.report.reason,
						value: report.reason,
					},
					{
						name: strings.report.link,
						value: report.messageLink !== undefined ? report.messageLink : `*${strings.report.noLinkProvided}*`,
					},
				],
				footer: { text: `${author.id}${constants.symbols.meta.metadataSeparator}${reportReferenceId}` },
			},
			...recipientAndWarningsTuples.map(([recipient, warnings]) => ({
				...getWarningPage(client, warnings, false, defaultLocale),
				title: strings.previousInfractions.title({ 'username': diagnosticMentionUser(recipient) }),
			})),
		],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [
				!report.isResolved
					? {
						type: MessageComponentTypes.Button,
						style: ButtonStyles.Primary,
						label: strings.markResolved,
						customId: encodeId<ReportPromptButtonID>(
							constants.staticComponentIds.reports,
							[author.id.toString(), guild.id.toString(), reportReferenceId, `${true}`],
						),
					}
					: {
						type: MessageComponentTypes.Button,
						style: ButtonStyles.Secondary,
						label: strings.markUnresolved,
						customId: encodeId<ReportPromptButtonID>(
							constants.staticComponentIds.reports,
							[author.id.toString(), guild.id.toString(), reportReferenceId, `${false}`],
						),
					},
			],
		}],
	};
}

export default service;
export {
	authorIdByMessageId,
	getRecipientAndWarningsTuples,
	getReportPrompt,
	messageIdByReportReferenceId,
	registerReportHandler,
	reportByMessageId,
};
