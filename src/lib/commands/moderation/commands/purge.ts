import { Locale } from "../../../../constants/languages";
import diagnostics from "../../../../diagnostics";
import { mention, timestamp, trim } from "../../../../formatting";
import { toChunked } from "../../../../utils";
import { Client, InteractionCollector, isValidSnowflake } from "../../../client";
import { Guild } from "../../../database/guild";
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

async function handlePurgeMessagesAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { author: string | undefined }>,
): Promise<void> {
	if (interaction.parameters.author === undefined) {
		return;
	}

	client.autocompleteMembers(interaction, {
		identifier: interaction.parameters.author,
		options: { includeBots: true },
	});
}

async function handlePurgeMessages(
	client: Client,
	interaction: Logos.Interaction<any, { start: string; end: string; author: string | undefined }>,
): Promise<void> {
	const language = interaction.language;
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const configuration = guildDocument.purging;
	if (configuration === undefined) {
		return;
	}

	client.postponeReply(interaction);

	let authorId: bigint | undefined;
	if (interaction.parameters.author !== undefined) {
		const authorMember = client.resolveInteractionToMember(
			interaction,
			{
				identifier: interaction.parameters.author,
				options: { includeBots: true },
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

	const isStartValid = isValidSnowflake(interaction.parameters.start);
	const isEndValid = interaction.parameters.end === undefined || isValidSnowflake(interaction.parameters.end);
	if (!(isStartValid && isEndValid)) {
		displaySnowflakesInvalidError(client, interaction, [!isStartValid, !isEndValid], { locale });
		return;
	}

	const channelId = interaction.channelId;
	if (channelId === undefined) {
		return;
	}

	const end =
		interaction.parameters.end ??
		(await client.bot.rest
			.getMessages(channelId, { limit: 1 })
			.catch(() => undefined)
			.then((messages) => messages?.at(0)?.id?.toString()));

	if (end === undefined) {
		displayFailedError(client, interaction, { locale });
		return;
	}

	if (interaction.parameters.start === end) {
		displayIdsNotDifferentError(client, interaction, { locale });
		return;
	}

	let [startMessageId, endMessageId] = [
		Discord.snowflakeToBigint(interaction.parameters.start),
		Discord.snowflakeToBigint(end),
	];

	if (startMessageId > endMessageId) {
		[startMessageId, endMessageId] = [endMessageId, startMessageId];
	}

	const [startTimestamp, endTimestamp] = [
		Discord.snowflakeToTimestamp(startMessageId),
		Discord.snowflakeToTimestamp(endMessageId),
	];

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

	const channelMention = mention(channelId, { type: "channel" });

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
				relative_timestamp: timestamp(Date.parse(startMessage.timestamp), { format: "relative" }),
				user_mention: mention(BigInt(startMessage.author.id), { type: "user" }),
			}),
			end: client.localise("purge.strings.end", locale)(),
			postedEnd: (endMessageContent !== undefined
				? client.localise("purge.strings.posted", locale)
				: client.localise("purge.strings.embedPosted", locale))({
				relative_timestamp: timestamp(Date.parse(endMessage.timestamp), { format: "relative" }),
				user_mention: mention(BigInt(endMessage.author.id), { type: "user" }),
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
					color: constants.colours.peach,
				},
			],
		};
	};

	client.editReply(interaction, getIndexingProgressResponse());

	const indexProgressIntervalId = setInterval(() => client.editReply(interaction, getIndexingProgressResponse()), 1500);

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

			client.editReply(interaction, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.rangeTooBig}\n\n${strings.description.trySmaller}`,
						color: constants.colours.yellow,
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

		client.editReply(interaction, {
			embeds: [
				{
					title: strings.indexed.title,
					description: `${strings.indexed.description.none}\n\n${strings.indexed.description.tryDifferentQuery}`,
					fields: getMessageFields(),
					color: constants.colours.husky,
				},
			],
		});
		return;
	}

	let shouldContinue = false;

	if (messages.length >= defaults.MAX_DELETABLE_MESSAGES) {
		const { promise, resolve } = Promise.withResolvers<boolean>();

		const continueButton = new InteractionCollector(client, { only: [interaction.user.id], isSingle: true });
		const cancelButton = new InteractionCollector(client, { only: [interaction.user.id], isSingle: true });

		continueButton.onCollect(async (buttonPress) => {
			client.acknowledge(buttonPress);
			resolve(true);
		});

		cancelButton.onCollect(async (buttonPress) => {
			client.acknowledge(buttonPress);
			resolve(false);
		});

		client.registerInteractionCollector(continueButton);
		client.registerInteractionCollector(cancelButton);

		const strings = {
			indexed: {
				title: client.localise("purge.strings.indexed.title", locale)(),
				description: {
					tooMany: client.localise(
						"purge.strings.indexed.description.tooMany",
						locale,
					)({
						messages: client.pluralise("purge.strings.indexed.description.tooMany.messages", language, messages.length),
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

		client.editReply(interaction, {
			embeds: [
				{
					title: strings.indexed.title,
					description: `${strings.indexed.description.tooMany}\n\n${strings.indexed.description.limited}`,
					fields: getMessageFields(),
					color: constants.colours.yellow,
				},
				{
					title: strings.continue.title,
					description: strings.continue.description,
					color: constants.colours.husky,
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: continueButton.customId,
							label: strings.yes,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: cancelButton.customId,
							label: strings.no,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});

		// TODO(vxern): This is currently unsafe because it will hang indefinitely if the user never presses a button.
		shouldContinue = await promise;
		if (!shouldContinue) {
			client.deleteReply(interaction);
			return;
		}

		messages = messages.slice(0, defaults.MAX_DELETABLE_MESSAGES);
	}

	if (!shouldContinue) {
		const { promise, resolve } = Promise.withResolvers<boolean>();

		const continueButton = new InteractionCollector(client, { only: [interaction.user.id], isSingle: true });
		const cancelButton = new InteractionCollector(client, { only: [interaction.user.id], isSingle: true });

		continueButton.onCollect(async (buttonPress) => {
			client.acknowledge(buttonPress);
			resolve(true);
		});

		cancelButton.onCollect(async (buttonPress) => {
			client.acknowledge(buttonPress);
			resolve(false);
		});

		client.registerInteractionCollector(continueButton);
		client.registerInteractionCollector(cancelButton);

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

		client.editReply(interaction, {
			embeds: [
				{
					title: strings.indexed.title,
					description: strings.indexed.description.some,
					fields: getMessageFields(),
					color: constants.colours.blue,
				},
				{
					title: strings.sureToPurge.title,
					description: strings.sureToPurge.description,
					color: constants.colours.husky,
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: continueButton.customId,
							label: strings.yes,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: cancelButton.customId,
							label: strings.no,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});

		const isShouldPurge = await promise;
		if (!isShouldPurge) {
			client.deleteReply(interaction);
			return;
		}
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

		client.editReply(interaction, {
			embeds: [
				{
					title: strings.purging.title,
					description: `${strings.purging.description.purging} ${strings.purging.description.mayTakeTime}\n\n${strings.purging.description.onceComplete}`,
					color: constants.colours.blue,
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

	client.tryLog("purgeBegin", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [member, channel, messages.length],
	});

	const twoWeeksAgo = now - constants.time.week * 2 + constants.time.hour;

	const firstBulkDeletableIndex = messages.findIndex((message) => Date.parse(message.timestamp) > twoWeeksAgo);
	const bulkDeletable = firstBulkDeletableIndex !== -1 ? messages.slice(firstBulkDeletableIndex, messages.length) : [];
	const nonBulkDeletable = messages.slice(
		0,
		firstBulkDeletableIndex !== -1 ? firstBulkDeletableIndex : messages.length,
	);

	let responseDeleted = false;

	const responseDeletionTimeoutId = setTimeout(async () => {
		responseDeleted = true;
		client.deleteReply(interaction);
	}, constants.time.minute * 1);

	let deletedCount = 0;

	if (bulkDeletable.length < 2) {
		nonBulkDeletable.push(...bulkDeletable.splice(0));
	} else {
		const bulkDeletableChunks = toChunked(bulkDeletable, 100);
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

	client.tryLog("purgeEnd", {
		guildId: guild.id,
		journalling: configuration.journaling,
		args: [member, channel, deletedCount],
	});

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

		client.editReply(interaction, {
			embeds: [
				{
					title: strings.purged.title,
					description: strings.purged.description,
					color: constants.colours.lightGreen,
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

	client.editReply(interaction, {
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
				color: constants.colours.red,
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

	client.editReply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colours.red,
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

	client.editReply(interaction, {
		embeds: [
			{
				title: strings.title,
				description: strings.description,
				color: constants.colours.red,
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
