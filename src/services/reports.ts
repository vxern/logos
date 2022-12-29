import {
	ApplicationCommandFlags,
	Bot,
	ButtonStyles,
	CreateMessage,
	deleteMessage,
	getAvatarURL,
	Guild,
	InteractionResponseTypes,
	InteractionTypes,
	Message,
	MessageComponentTypes,
	sendInteractionResponse,
	sendMessage,
	User as DiscordUser,
} from 'discordeno';
import { lodash } from 'lodash';
import { localise, Services } from 'logos/assets/localisations/mod.ts';
import { generateWarningsPage } from 'logos/src/commands/information/commands/list/warnings.ts';
import { Report, User, Warning } from 'logos/src/database/structs/mod.ts';
import { Document, Reference } from 'logos/src/database/document.ts';
import { stringifyValue } from 'logos/src/database/database.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client, WithLanguage } from 'logos/src/client.ts';
import { createInteractionCollector, InteractionCollectorSettings } from 'logos/src/interactions.ts';
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
		onCollect: (_bot, selection) => {
			const [_customId, authorId, guildId, reportReference, _isClose] = selection.data!.customId!.split('|');

			const handle = reportPromptHandlers.get(`${authorId}|${guildId}|${reportReference}`);
			if (handle === undefined) return;

			return void handle(bot, selection);
		},
	});
}

interface ReportPromptMetadata {
	authorId: bigint;
	reportReferenceId: string;
}

const metadataSeparator = '・';

function extractMetadata(prompt: Message): ReportPromptMetadata | undefined {
	const metadata = prompt.embeds.at(0)?.footer?.text;
	if (metadata === undefined) return undefined;

	const [authorId, reportReferenceId] = metadata.split(metadataSeparator);
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

	const { guildCreate } = bot.events;

	bot.events.guildCreate = async (bot, guild_) => {
		guildCreate(bot, guild_);

		const guild = client.cache.guilds.get(guild_.id)!;

		const reportChannelId = getTextChannel(guild, configuration.guilds.channels.reports)?.id;
		if (reportChannelId === undefined) {
			client.log.error(
				`Failed to register previous reports on ${guild.name}: There is no report channel.`,
			);
			return;
		}

		reportChannelIdByGuildId.set(guild.id, reportChannelId);

		const reportPromptsAll = await getAllMessages(bot, reportChannelId);
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
					getReportPrompt(bot, guild, author, recipientAndWarningsTuples, report),
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
	};
}

function ensureReportPromptPersistence([client, bot]: [Client, Bot]): void {
	const { messageDelete, messageUpdate } = bot.events;

	// Anti-tampering feature; detects report prompts being deleted.
	bot.events.messageDelete = async (bot, payload) => {
		const [messageId, channelId, guildId] = [payload.id, payload.channelId, payload.guildId!];

		// If the message was deleted from any other channel apart from a report channel.
		if (reportChannelIdByGuildId.get(guildId) !== channelId) {
			return messageDelete(bot, payload);
		}

		const report = reportByMessageId.get(messageId);
		if (report === undefined) return;

		const authorId = authorIdByMessageId.get(messageId);
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

		const guild = client.cache.guilds.get(guildId)!;

		const newMessageId = await sendMessage(
			bot,
			channelId,
			getReportPrompt(bot, guild, author, recipientAndWarningsTuples, report),
		).then((message) => message.id);
		reportByMessageId.delete(messageId);
		authorIdByMessageId.delete(messageId);
		reportByMessageId.set(newMessageId, report);
		authorIdByMessageId.set(newMessageId, authorId);

		const reportReferenceId = stringifyValue(report.ref);

		messageIdByReportReferenceId.delete(reportReferenceId);
		messageIdByReportReferenceId.set(reportReferenceId, newMessageId);

		messageDelete(bot, payload);
	};

	// Anti-tampering feature; detects embeds being deleted from report prompts.
	bot.events.messageUpdate = (bot, message, oldMessage) => {
		// If the message was updated in any other channel apart from a report channel.
		if (reportChannelIdByGuildId.get(message.guildId!) !== message.channelId) {
			return messageUpdate(bot, message, oldMessage);
		}

		// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
		if (message.embeds.length === 1) return;

		// Delete the message and allow the bot to handle the deletion.
		deleteMessage(bot, message.channelId, message.id);

		messageUpdate(bot, message, oldMessage);
	};
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
	reportPromptHandlers.set(`${authorId}|${guildId}|${reportReferenceId}`, async (bot, selection) => {
		const isClose = selection.data!.customId!.split('|')[4]! === 'true';

		const reports = client.database.adapters.reports.get(client, 'authorAndGuild', [
			authorReference,
			guildId.toString(),
		]);
		if (reports === undefined) return;

		const report = reports.get(reportReferenceId.toString());
		if (report === undefined) return;

		if (isClose && report.data.isResolved) {
			return void sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Services.reports.alreadyMarkedAsResolved, defaultLocale),
						color: constants.colors.dullYellow,
					}],
				},
			});
		}

		if (!isClose && !report.data.isResolved) {
			return void sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Services.reports.alreadyMarkedAsUnresolved, defaultLocale),
						color: constants.colors.dullYellow,
					}],
				},
			});
		}

		const updatedReportContent = lodash.cloneDeep(report) as Document<Report>;

		updatedReportContent.data.isResolved = isClose;

		const updatedReportDocument = await client.database.adapters.reports.update(client, updatedReportContent);
		if (updatedReportDocument === undefined) return;

		const messageId = messageIdByReportReferenceId.get(reportReferenceId);
		if (messageId === undefined) return;

		reportByMessageId.set(messageId, updatedReportDocument);

		deleteMessage(bot, channelId, messageId);

		return;
	});
}

function getReportPrompt(
	bot: Bot,
	guild: WithLanguage<Guild>,
	author: DiscordUser,
	recipientAndWarningsTuples: RecipientAndWarningsTuple[],
	reportDocument: Document<Report>,
): CreateMessage {
	const reportReferenceId = stringifyValue(reportDocument.ref);
	const report = reportDocument.data;

	return {
		embeds: [{
			title: diagnosticMentionUser(author),
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
					name: localise(Services.reports.submittedBy, defaultLocale),
					value: mention(author.id, MentionTypes.User),
				},
				{
					name: localise(Services.reports.submittedAt, defaultLocale),
					value: timestamp(reportDocument.data.createdAt),
				},
				{
					name: localise(Services.reports.reportedUsers, defaultLocale),
					value: recipientAndWarningsTuples.map(([recipient, _recipientWarnings]) =>
						mention(recipient.id, MentionTypes.User)
					).join(', '),
				},
				{
					name: localise(Services.reports.reasonForReport, defaultLocale),
					value: report.reason,
				},
				...(report.messageLink
					? [{
						name: localise(Services.reports.linkToMessage, defaultLocale),
						value: report.messageLink,
					}]
					: []),
			],
			footer: { text: `${author.id}${metadataSeparator}${reportReferenceId}` },
		}, {
			title: localise(Services.reports.previousInfractionsOfReportedUsers, defaultLocale),
			fields: recipientAndWarningsTuples.map(
				([recipient, warnings]) => ({
					name: diagnosticMentionUser(recipient),
					value: generateWarningsPage(warnings, false, defaultLocale),
				}),
			),
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [
				!report.isResolved
					? {
						type: MessageComponentTypes.Button,
						style: ButtonStyles.Primary,
						label: localise(Services.reports.markAsResolved, defaultLocale),
						customId: `${constants.staticComponentIds.reports}|${author.id}|${guild.id}|${reportReferenceId}|true`,
					}
					: {
						type: MessageComponentTypes.Button,
						style: ButtonStyles.Secondary,
						label: localise(Services.reports.markAsUnresolved, defaultLocale),
						customId: `${constants.staticComponentIds.reports}|${author.id}|${guild.id}|${reportReferenceId}|false`,
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
