import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import time from "../../../../constants/time";
import defaults from "../../../../defaults";
import { MentionTypes, mention, timestamp, trim } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, isValidSnowflake } from "../../../client";
import { Guild } from "../../../database/guild";
import diagnostics from "../../../diagnostics";
import {
	acknowledge,
	createInteractionCollector,
	deleteReply,
	editReply,
	parseArguments,
	postponeReply,
} from "../../../interactions";
import { chunk, snowflakeToTimestamp } from "../../../utils";
import { CommandTemplate } from "../../command";
import { user } from "../../parameters";

const command: CommandTemplate = {
	id: "purge",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["MODERATE_MEMBERS"],
	handle: handlePurgeMessages,
	handleAutocomplete: handlePurgeMessagesAutocomplete,
	options: [
		{
			id: "start",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
		},
		{
			id: "end",
			type: Discord.ApplicationCommandOptionTypes.String,
		},
		{ ...user, id: "author", required: false },
	],
};

async function handlePurgeMessagesAutocomplete(client: Client, interaction: Logos.Interaction): Promise<void> {
	const [{ author }] = parseArguments(interaction.data?.options, {});
	if (author === undefined) {
		return;
	}

	client.autocompleteMembers(interaction, { identifier: author, options: { includeBots: true } });
}

async function handlePurgeMessages(client: Client, interaction: Logos.Interaction): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

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

	const configuration = guildDocument.features.moderation.features?.purging;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ start, end: provisionalEnd, author: user }] = parseArguments(interaction.data?.options, {});
	if (start === undefined) {
		return;
	}

	postponeReply(client, interaction);

	let authorId: bigint | undefined;

	if (user !== undefined) {
		const authorMember = client.resolveInteractionToMember(
			interaction,
			{
				identifier: user,
				options: {
					includeBots: true,
				},
			},
			{ locale },
		);
		if (authorMember === undefined) {
			return;
		}

		authorId = authorMember.id;
	} else {
		authorId = undefined;
	}

	const isStartValid = isValidSnowflake(start);
	const isEndValid = provisionalEnd === undefined || isValidSnowflake(provisionalEnd);
	if (!(isStartValid && isEndValid)) {
		displaySnowflakesInvalidError(client, interaction, [!isStartValid, !isEndValid], { locale });
		return;
	}

	const channelId = interaction.channelId;
	if (channelId === undefined) {
		return;
	}

	const end =
		provisionalEnd ??
		(await client.bot.rest
			.getMessages(channelId, { limit: 1 })
			.catch(() => undefined)
			.then((messages) => messages?.at(0)?.id?.toString()));

	if (end === undefined) {
		displayFailedError(client, interaction, { locale });
		return;
	}

	if (start === end) {
		displayIdsNotDifferentError(client, interaction, { locale });
		return;
	}

	let [startMessageId, endMessageId] = [Discord.snowflakeToBigint(start), Discord.snowflakeToBigint(end)];

	if (startMessageId > endMessageId) {
		[startMessageId, endMessageId] = [endMessageId, startMessageId];
	}

	const [startTimestamp, endTimestamp] = [snowflakeToTimestamp(startMessageId), snowflakeToTimestamp(endMessageId)];

	const now = Date.now();

	const isStartInFuture = startTimestamp > now;
	const isEndInFuture = endTimestamp > now;
	if (isStartInFuture || isEndInFuture) {
		displaySnowflakesInvalidError(client, interaction, [isStartInFuture, isEndInFuture], { locale });
		return;
	}

	const [startMessage, endMessage] = await Promise.all([
		client.bot.rest.getMessage(channelId, startMessageId).catch(() => {
			client.log.warn(`Failed to get start message, ID ${startMessageId}.`);

			return undefined;
		}),
		client.bot.rest.getMessage(channelId, endMessageId).catch(() => {
			client.log.warn(`Failed to get end message, ID ${endMessageId}.`);

			return undefined;
		}),
	]);

	const notExistsStart = startMessage === undefined;
	const notExistsEnd = endMessage === undefined;
	if (notExistsStart || notExistsEnd) {
		displaySnowflakesInvalidError(client, interaction, [notExistsStart, notExistsEnd], { locale });
		return;
	}

	const channelMention = mention(channelId, MentionTypes.Channel);

	const [startMessageContent, endMessageContent] = [
		getMessageContent(client, startMessage, { locale }),
		getMessageContent(client, endMessage, { locale }),
	];

	let messages: Discord.CamelizedDiscordMessage[] = [];

	const getMessageFields = (): Discord.CamelizedDiscordEmbedField[] => {
		const strings = {
			start: client.localise("purge.strings.start", locale)(),
			postedStart: (startMessageContent !== undefined
				? client.localise("purge.strings.posted", locale)
				: client.localise("purge.strings.embedPosted", locale))({
				relative_timestamp: timestamp(Date.parse(startMessage.timestamp)),
				user_mention: mention(BigInt(startMessage.author.id), MentionTypes.User),
			}),
			end: client.localise("purge.strings.end", locale)(),
			postedEnd: (endMessageContent !== undefined
				? client.localise("purge.strings.posted", locale)
				: client.localise("purge.strings.embedPosted", locale))({
				relative_timestamp: timestamp(Date.parse(endMessage.timestamp)),
				user_mention: mention(BigInt(endMessage.author.id), MentionTypes.User),
			}),
			messagesFound: client.localise("purge.strings.messagesFound", locale)(),
		};

		return [
			{
				name: strings.start,
				value:
					startMessageContent !== undefined ? `${startMessageContent}\n${strings.postedStart}` : strings.postedStart,
			},
			{
				name: strings.end,
				value: endMessageContent !== undefined ? `${endMessageContent}\n${strings.postedEnd}` : strings.postedEnd,
			},
			{
				name: strings.messagesFound,
				value: messages.length.toString(),
			},
		];
	};

	const getIndexingProgressResponse = (): Discord.InteractionCallbackData => {
		const strings = {
			indexing: {
				title: client.localise("purge.strings.indexing.title", locale)(),
				description: client.localise("purge.strings.indexing.description", locale)(),
			},
		};

		return {
			embeds: [
				{
					title: strings.indexing.title,
					description: strings.indexing.description,
					fields: getMessageFields(),
					color: constants.colors.peach,
				},
			],
		};
	};

	editReply(client, interaction, getIndexingProgressResponse());

	const indexProgressIntervalId = setInterval(
		() => editReply(client, interaction, getIndexingProgressResponse()),
		1500,
	);

	let isFinished = false;
	while (!isFinished) {
		if (messages.length >= defaults.MAX_INDEXABLE_MESSAGES) {
			clearInterval(indexProgressIntervalId);

			const strings = {
				title: client.localise("purge.strings.rangeTooBig.title", locale)(),
				description: {
					rangeTooBig: client.localise(
						"purge.strings.rangeTooBig.description.rangeTooBig",
						locale,
					)({
						messages: client.pluralise(
							"purge.strings.rangeTooBig.description.rangeTooBig.messages",
							language,
							defaults.MAX_INDEXABLE_MESSAGES,
						),
					}),
					trySmaller: client.localise("purge.strings.rangeTooBig.description.trySmaller", locale)(),
				},
			};

			editReply(client, interaction, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.rangeTooBig}\n\n${strings.description.trySmaller}`,
						color: constants.colors.yellow,
					},
				],
			});
			return;
		}

		const newMessages = await client.bot.rest
			.getMessages(channelId, {
				after: messages.length === 0 ? startMessage.id : messages.at(-1)?.id,
				limit: 100,
			})
			.then((collection) => Array.from(collection.values()).reverse())
			.catch((reason) => {
				client.log.warn(
					`Failed to get messages starting with ${diagnostics.display.message(startMessage.id)}:`,
					reason,
				);

				return [];
			});
		if (newMessages.length === 0) {
			isFinished = true;
			continue;
		}

		const lastMessageInRangeIndex = newMessages.findLastIndex((message) => message.id <= endMessage.id);
		const messagesInRange = newMessages.slice(0, lastMessageInRangeIndex + 1);

		if (messagesInRange.length === 0) {
			isFinished = true;
		}

		const messagesToDelete =
			authorId !== undefined
				? messagesInRange.filter((message) => BigInt(message.author.id) === authorId)
				: messagesInRange;
		messages.push(...messagesToDelete);

		// If the chunk is incomplete or if not all of it is relevant,
		// there are no more relevant messages; therefore finished.
		if (messagesInRange.length < 100) {
			isFinished = true;
		}

		// If the end message has been found, there are no more relevant messages; therefore finished.
		if (messagesInRange.at(-1)?.id === endMessage.id) {
			isFinished = true;
		}
	}

	if (authorId === undefined || BigInt(startMessage.author.id) === authorId) {
		messages.unshift(startMessage);
	}

	clearInterval(indexProgressIntervalId);

	if (messages.length === 0) {
		const strings = {
			indexed: {
				title: client.localise("purge.strings.indexed.title", locale)(),
				description: {
					none: client.localise("purge.strings.indexed.description.none", locale)(),
					tryDifferentQuery: client.localise("purge.strings.indexed.description.tryDifferentQuery", locale)(),
				},
			},
		};

		editReply(client, interaction, {
			embeds: [
				{
					title: strings.indexed.title,
					description: `${strings.indexed.description.none}\n\n${strings.indexed.description.tryDifferentQuery}`,
					fields: getMessageFields(),
					color: constants.colors.husky,
				},
			],
		});
		return;
	}

	let isShouldContinue = false;

	if (messages.length >= defaults.MAX_DELETABLE_MESSAGES) {
		isShouldContinue = await new Promise<boolean>((resolve) => {
			const continueId = createInteractionCollector(client, {
				type: Discord.InteractionTypes.MessageComponent,
				onCollect: async (selection) => {
					acknowledge(client, selection);
					resolve(true);
				},
			});

			const cancelId = createInteractionCollector(client, {
				type: Discord.InteractionTypes.MessageComponent,
				onCollect: async (selection) => {
					acknowledge(client, selection);
					resolve(false);
				},
			});

			const strings = {
				indexed: {
					title: client.localise("purge.strings.indexed.title", locale)(),
					description: {
						tooMany: client.localise(
							"purge.strings.indexed.description.tooMany",
							locale,
						)({
							messages: client.pluralise(
								"purge.strings.indexed.description.tooMany.messages",
								language,
								messages.length,
							),
							maximum_deletable: defaults.MAX_DELETABLE_MESSAGES,
						}),
						limited: client.localise(
							"purge.strings.indexed.description.limited",
							locale,
						)({
							messages: client.pluralise(
								"purge.strings.indexed.description.limited.messages",
								language,
								defaults.MAX_DELETABLE_MESSAGES,
							),
						}),
					},
				},
				continue: {
					title: client.localise("purge.strings.continue.title", locale)(),
					description: client.localise(
						"purge.strings.continue.description",
						locale,
					)({
						messages: client.pluralise(
							"purge.strings.continue.description.messages",
							language,
							defaults.MAX_DELETABLE_MESSAGES,
						),
						allMessages: client.pluralise("purge.strings.continue.description.allMessages", language, messages.length),
						channel_mention: channelMention,
					}),
				},
				yes: client.localise("purge.strings.yes", locale)(),
				no: client.localise("purge.strings.no", locale)(),
			};

			editReply(client, interaction, {
				embeds: [
					{
						title: strings.indexed.title,
						description: `${strings.indexed.description.tooMany}\n\n${strings.indexed.description.limited}`,
						fields: getMessageFields(),
						color: constants.colors.yellow,
					},
					{
						title: strings.continue.title,
						description: strings.continue.description,
						color: constants.colors.husky,
					},
				],
				components: [
					{
						type: Discord.MessageComponentTypes.ActionRow,
						components: [
							{
								type: Discord.MessageComponentTypes.Button,
								customId: continueId,
								label: strings.yes,
								style: Discord.ButtonStyles.Success,
							},
							{
								type: Discord.MessageComponentTypes.Button,
								customId: cancelId,
								label: strings.no,
								style: Discord.ButtonStyles.Danger,
							},
						],
					},
				],
			});
		});

		if (!isShouldContinue) {
			deleteReply(client, interaction);
			return;
		}

		messages = messages.slice(0, defaults.MAX_DELETABLE_MESSAGES);
	}

	const isShouldPurge =
		isShouldContinue ||
		(await new Promise<boolean>((resolve) => {
			const continueId = createInteractionCollector(client, {
				type: Discord.InteractionTypes.MessageComponent,
				onCollect: async (selection) => {
					acknowledge(client, selection);
					resolve(true);
				},
			});

			const cancelId = createInteractionCollector(client, {
				type: Discord.InteractionTypes.MessageComponent,
				onCollect: async (selection) => {
					acknowledge(client, selection);
					resolve(false);
				},
			});

			const strings = {
				indexed: {
					title: client.localise("purge.strings.indexed.title", locale)(),
					description: {
						some: client.localise(
							"purge.strings.indexed.description.some",
							locale,
						)({
							messages: client.pluralise("purge.strings.indexed.description.some.messages", language, messages.length),
						}),
					},
				},
				sureToPurge: {
					title: client.localise("purge.strings.sureToPurge.title", locale)(),
					description: client.localise(
						"purge.strings.sureToPurge.description",
						locale,
					)({
						messages: client.pluralise("purge.strings.sureToPurge.description.messages", language, messages.length),
						channel_mention: channelMention,
					}),
				},
				yes: client.localise("purge.strings.yes", locale)(),
				no: client.localise("purge.strings.no", locale)(),
			};

			editReply(client, interaction, {
				embeds: [
					{
						title: strings.indexed.title,
						description: strings.indexed.description.some,
						fields: getMessageFields(),
						color: constants.colors.blue,
					},
					{
						title: strings.sureToPurge.title,
						description: strings.sureToPurge.description,
						color: constants.colors.husky,
					},
				],
				components: [
					{
						type: Discord.MessageComponentTypes.ActionRow,
						components: [
							{
								type: Discord.MessageComponentTypes.Button,
								customId: continueId,
								label: strings.yes,
								style: Discord.ButtonStyles.Success,
							},
							{
								type: Discord.MessageComponentTypes.Button,
								customId: cancelId,
								label: strings.no,
								style: Discord.ButtonStyles.Danger,
							},
						],
					},
				],
			});
		}));

	if (!isShouldPurge) {
		deleteReply(client, interaction);
		return;
	}

	{
		const strings = {
			purging: {
				title: client.localise("purge.strings.purging.title", locale)(),
				description: {
					purging: client.localise(
						"purge.strings.purging.description.purging",
						locale,
					)({
						messages: client.pluralise("purge.strings.purging.description.purging.messages", language, messages.length),
						channel_mention: channelMention,
					}),
					mayTakeTime: client.localise("purge.strings.purging.description.mayTakeTime", locale)(),
					onceComplete: client.localise("purge.strings.purging.description.onceComplete", locale)(),
				},
			},
		};

		editReply(client, interaction, {
			embeds: [
				{
					title: strings.purging.title,
					description: `${strings.purging.description.purging} ${strings.purging.description.mayTakeTime}\n\n${strings.purging.description.onceComplete}`,
					color: constants.colors.blue,
				},
			],
			components: [],
		});
	}

	client.log.info(
		`Purging ${messages.length} message(s) in ${diagnostics.display.channel(
			channelId,
		)} as requested by ${diagnostics.display.user(interaction.user)}...`,
	);

	const [guild, member, channel] = [
		client.entities.guilds.get(guildId),
		client.entities.members.get(Discord.snowflakeToBigint(`${interaction.user.id}${guildId}`)),
		client.entities.channels.get(channelId),
	];
	if (guild === undefined || member === undefined || channel === undefined) {
		return;
	}

	const journallingService = client.getJournallingService(guild.id);

	if (configuration.journaling) {
		journallingService?.log("purgeBegin", { args: [member, channel, messages.length] });
	}

	const twoWeeksAgo = now - time.week * 2 + time.hour;

	const firstBulkDeletableIndex = messages.findIndex((message) => Date.parse(message.timestamp) > twoWeeksAgo);
	const bulkDeletable = firstBulkDeletableIndex !== -1 ? messages.slice(firstBulkDeletableIndex, messages.length) : [];
	const nonBulkDeletable = messages.slice(
		0,
		firstBulkDeletableIndex !== -1 ? firstBulkDeletableIndex : messages.length,
	);

	let responseDeleted = false;

	const responseDeletionTimeoutId = setTimeout(async () => {
		responseDeleted = true;
		deleteReply(client, interaction);
	}, time.minute * 1);

	let deletedCount = 0;

	if (bulkDeletable.length < 2) {
		nonBulkDeletable.push(...bulkDeletable.splice(0));
	} else {
		const bulkDeletableChunks = chunk(bulkDeletable, 100);
		for (const chunk of bulkDeletableChunks) {
			const messageIds = chunk.map((message) => message.id);

			await client.bot.rest.deleteMessages(channelId, messageIds).catch((reason) => {
				client.log.warn(
					`Failed to delete ${messageIds.length} message(s) from ${diagnostics.display.channel(channelId)}:`,
					reason,
				);
			});

			await new Promise((resolve) => setTimeout(resolve, 1000));

			deletedCount += messageIds.length;
		}
	}

	for (const message of nonBulkDeletable) {
		await client.bot.rest
			.deleteMessage(channelId, message.id)
			.catch((reason) => client.log.warn(`Failed to delete ${diagnostics.display.message(message)}:`, reason));

		await new Promise((resolve) => setTimeout(resolve, 1000));

		deletedCount += 1;
	}

	client.log.info(
		`Purged ${deletedCount}/${
			messages.length
		} message(s) in channel ID ${channelId} as requested by ${diagnostics.display.user(interaction.user)}.`,
	);

	if (configuration.journaling) {
		journallingService?.log("purgeEnd", { args: [member, channel, deletedCount] });
	}

	clearTimeout(responseDeletionTimeoutId);

	if (responseDeleted) {
		return;
	}

	{
		const strings = {
			purged: {
				title: client.localise("purge.strings.purged.title", locale)(),
				description: client.localise(
					"purge.strings.purged.description",
					locale,
				)({
					messages: client.pluralise("purge.strings.purged.description.messages", language, deletedCount),
					channel_mention: channelMention,
				}),
			},
		};

		editReply(client, interaction, {
			embeds: [
				{
					title: strings.purged.title,
					description: strings.purged.description,
					color: constants.colors.lightGreen,
					image: { url: constants.gifs.done },
				},
			],
		});
	}
}

async function displaySnowflakesInvalidError(
	client: Client,
	interaction: Logos.Interaction,
	[isStartInvalid, isEndInvalid]: [boolean, boolean],
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		start: {
			title: client.localise("purge.strings.invalid.start.title", locale)(),
			description: client.localise("purge.strings.invalid.start.description", locale)(),
		},
		end: {
			title: client.localise("purge.strings.invalid.end.title", locale)(),
			description: client.localise("purge.strings.invalid.end.description", locale)(),
		},
		both: {
			title: client.localise("purge.strings.invalid.both.title", locale)(),
			description: client.localise("purge.strings.invalid.both.description", locale)(),
		},
	};

	const areBothInvalid = isStartInvalid && isEndInvalid;

	editReply(client, interaction, {
		embeds: [
			{
				...(areBothInvalid
					? {
							title: strings.both.title,
							description: strings.both.description,
					  }
					: isStartInvalid
					  ? {
								title: strings.start.title,
								description: strings.start.description,
						  }
					  : {
								title: strings.end.title,
								description: strings.end.description,
						  }),
				color: constants.colors.red,
			},
		],
	});
}

async function displayIdsNotDifferentError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("purge.strings.idsNotDifferent.title", locale)(),
		description: client.localise("purge.strings.idsNotDifferent.description", locale)(),
	};

	editReply(client, interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

async function displayFailedError(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Promise<void> {
	const strings = {
		title: client.localise("purge.strings.failed.title", locale)(),
		description: client.localise("purge.strings.failed.description", locale)(),
	};

	editReply(client, interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			},
		],
	});
}

function getMessageContent(
	client: Client,
	message: Discord.CamelizedDiscordMessage,
	{ locale }: { locale: Locale },
): string | undefined {
	if (message.content?.trim().length === 0 && message.embeds.length !== 0) {
		return undefined;
	}

	const content = trim(message.content ?? "", 500).trim();
	if (content.length === 0) {
		const strings = {
			noContent: client.localise("purge.strings.noContent", locale)(),
		};

		return `> *${strings.noContent}*`;
	}

	return `> ${content}`;
}

export default command;
