import {
	addRole,
	ApplicationCommandFlags,
	banMember,
	Bot,
	ButtonStyles,
	CreateMessage,
	deleteMessage,
	editOriginalInteractionResponse,
	getAvatarURL,
	getDmChannel,
	Guild,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	Message,
	MessageComponentTypes,
	sendInteractionResponse,
	sendMessage,
	TextStyles,
	User as DiscordUser,
} from 'discordeno';
import { lodash } from 'lodash';
import { localise, Modals, Services } from 'logos/assets/localisations/mod.ts';
import { log } from 'logos/src/controllers/logging/logging.ts';
import { EntryRequest, User } from 'logos/src/database/structs/mod.ts';
import { Document, Reference } from 'logos/src/database/document.ts';
import { stringifyValue } from 'logos/src/database/database.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client, WithLanguage } from 'logos/src/client.ts';
import {
	createInteractionCollector,
	createModalComposer,
	InteractionCollectorSettings,
	Modal,
} from 'logos/src/interactions.ts';
import { diagnosticMentionUser, getAllMessages, getTextChannel, guildAsAuthor } from 'logos/src/utils.ts';
import { defaultLocale } from 'logos/types.ts';
import configuration from 'logos/configuration.ts';
import { staticComponentIds } from 'logos/constants.ts';

const verificationPromptHandlers = new Map<string, NonNullable<InteractionCollectorSettings['onCollect']>>();

const service: ServiceStarter = ([client, bot]) => {
	setupVoteHandler([client, bot]);
	registerPastEntryRequests([client, bot]);
	ensureVerificationPromptPersistence([client, bot]);
};

function setupVoteHandler([client, bot]: [Client, Bot]): void {
	createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		customId: staticComponentIds.verification,
		doesNotExpire: true,
		onCollect: (_bot, selection) => {
			const [_customId, userId, guildId, _isAccept] = selection.data!.customId!.split('|');

			const handle = verificationPromptHandlers.get(`${userId}|${guildId}`);
			if (handle === undefined) return;

			return void handle(bot, selection);
		},
	});
}

function extractUserID(prompt: Message): bigint | undefined {
	const id = prompt.embeds.at(0)?.footer?.text;
	if (id === undefined) return undefined;

	return BigInt(id);
}

function getValidPrompts(bot: Bot, prompts: Message[]): Message[] {
	return prompts.filter(
		(prompt) => {
			if (extractUserID(prompt) === undefined) {
				deleteMessage(bot, prompt.channelId, prompt.id);
				return false;
			}

			return true;
		},
	);
}

const verificationChannelIdByGuildId = new Map<bigint, bigint>();
const entryRequestByMessageId = new Map<bigint, Document<EntryRequest>>();
const submitterIdByMessageId = new Map<bigint, bigint>();
const messageIdBySubmitterAndGuild = new Map<string, bigint>();

function registerPastEntryRequests([client, bot]: [Client, Bot]): void {
	const entryRequestsByGuildId = new Map<bigint, Document<EntryRequest>[]>();
	{
		for (const entryRequest of client.database.cache.entryRequestBySubmitterAndGuild.values()) {
			const guildId = BigInt(entryRequest.data.guild);

			if (!entryRequestsByGuildId.has(guildId)) {
				entryRequestsByGuildId.set(guildId, [entryRequest]);
				continue;
			}

			entryRequestsByGuildId.get(guildId)!.push(entryRequest);
		}
	}

	const { guildCreate } = bot.events;

	bot.events.guildCreate = async (bot, guild_) => {
		await guildCreate(bot, guild_);

		const guild = client.cache.guilds.get(guild_.id)!;

		const entryRequests = entryRequestsByGuildId.get(guild.id) ?? [];
		const unfinalisedEntryRequestsCount = entryRequests.filter((request) => !request.data.isFinalised).length;

		if (unfinalisedEntryRequestsCount !== 0) {
			client.log.debug(`Found ${unfinalisedEntryRequestsCount} unfinalised entry request(s) on ${guild.name}.`);
		}

		const verificationChannelId = getTextChannel(guild, configuration.guilds.channels.verification)?.id;
		if (verificationChannelId === undefined) {
			client.log.error(
				`Failed to register previous entry requests on ${guild.name}: There is no verification channel.`,
			);
			return;
		}

		verificationChannelIdByGuildId.set(guild.id, verificationChannelId);

		const verificationPromptsAll = await getAllMessages(bot, verificationChannelId);
		const verificationPrompts = getValidPrompts(bot, verificationPromptsAll);
		const verificationPromptBySubmitterId = new Map(
			verificationPrompts.map((prompt) => [extractUserID(prompt)!, prompt]),
		);

		for (const entryRequest of entryRequests) {
			const submitterReferenceId = BigInt(stringifyValue(entryRequest.data.submitter));

			const submitterDocument = await client.database.adapters.users.getOrFetch(
				client,
				'reference',
				entryRequest.data.submitter,
			);
			if (submitterDocument === undefined) {
				client.log.error(
					`Failed to register entry request submitted by user with reference ${submitterReferenceId} to guild ${guild.name}: ` +
						`Could not get the user document.`,
				);
				continue;
			}

			const submitterId = BigInt(submitterDocument.data.account.id);

			let messageId!: bigint;
			const prompt = verificationPromptBySubmitterId.get(submitterId);
			if (prompt !== undefined) {
				verificationPromptBySubmitterId.delete(submitterId);
			}

			if (entryRequest.data.isFinalised) {
				if (prompt !== undefined) {
					deleteMessage(bot, prompt.channelId, prompt.id);
				}
				continue;
			}

			if (prompt === undefined) {
				const submitter = client.cache.users.get(submitterId);
				if (submitter === undefined) {
					client.log.error(
						`Failed to register entry request submitted by user with ID ${submitterId} to guild ${guild.name}: ` +
							`The user is not cached.`,
					);
					continue;
				}

				messageId = await displayVerificationPrompt(
					bot,
					verificationChannelId,
					getVerificationPrompt(bot, guild, submitter, entryRequest.data, getNecessaryVotes(guild, entryRequest.data)),
				);
			} else {
				messageId = prompt.id;
			}

			entryRequestByMessageId.set(messageId, entryRequest);
			submitterIdByMessageId.set(messageId, submitterId);
			messageIdBySubmitterAndGuild.set(`${submitterReferenceId}${guild.id}`, messageId);

			registerVerificationHandler(client, guild.id, verificationChannelId, [
				BigInt(submitterDocument.data.account.id),
				submitterDocument.ref,
			]);
		}

		// These are the prompts which aren't connected to any entry request.
		const remainingVerificationPrompts = verificationPromptBySubmitterId.values();
		for (const prompt of remainingVerificationPrompts) {
			deleteMessage(bot, prompt.channelId, prompt.id);
		}
	};
}

function ensureVerificationPromptPersistence([client, bot]: [Client, Bot]): void {
	const { messageDelete, messageUpdate } = bot.events;

	// Anti-tampering feature; detects verification prompts being deleted.
	bot.events.messageDelete = async (bot, payload) => {
		const [messageId, channelId, guildId] = [payload.id, payload.channelId, payload.guildId!];

		// If the message was deleted from any other channel apart from a verification channel.
		if (verificationChannelIdByGuildId.get(guildId) !== channelId) {
			return messageDelete(bot, payload);
		}

		const entryRequest = entryRequestByMessageId.get(messageId);
		if (entryRequest === undefined || entryRequest.data.isFinalised) return;

		const submitterId = submitterIdByMessageId.get(messageId);
		if (submitterId === undefined) return;

		const submitter = client.cache.users.get(submitterId);
		if (submitter === undefined) return;

		const guild = client.cache.guilds.get(guildId)!;

		const newMessageId = await displayVerificationPrompt(
			bot,
			channelId,
			getVerificationPrompt(bot, guild, submitter, entryRequest.data, getNecessaryVotes(guild, entryRequest.data)),
		);
		entryRequestByMessageId.delete(messageId);
		submitterIdByMessageId.delete(messageId);
		entryRequestByMessageId.set(newMessageId, entryRequest);
		submitterIdByMessageId.set(newMessageId, submitterId);

		const submitterReferenceId = stringifyValue(entryRequest.data.submitter);
		const compositeId = `${submitterReferenceId}${guild.id}`;

		messageIdBySubmitterAndGuild.delete(compositeId);
		messageIdBySubmitterAndGuild.set(compositeId, newMessageId);

		messageDelete(bot, payload);
	};

	// Anti-tampering feature; detects embeds being deleted from verification prompts.
	bot.events.messageUpdate = (bot, message, oldMessage) => {
		// If the message was updated in any other channel apart from a verification channel.
		if (verificationChannelIdByGuildId.get(message.guildId!) !== message.channelId) {
			return messageUpdate(bot, message, oldMessage);
		}

		// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
		if (message.embeds.length === 1) return;

		// Delete the message and allow the bot to handle the deletion.
		deleteMessage(bot, message.channelId, message.id);

		messageUpdate(bot, message, oldMessage);
	};
}

async function initiateVerificationProcess(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	guild: WithLanguage<Guild>,
	requestedRoleId: bigint,
): Promise<boolean> {
	const submitterDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'id',
		interaction.user.id.toString(),
		interaction.user.id,
	);
	if (submitterDocument === undefined) {
		displayVerifyError(bot, interaction);
		return false;
	}

	const entryRequest = client.database.adapters.entryRequests.get(
		client,
		'submitterAndGuild',
		[submitterDocument.ref, guild.id.toString()],
	);
	if (entryRequest !== undefined) {
		sendInteractionResponse(bot, interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(Services.entry.alreadySubmittedAnswers, interaction.locale),
					color: configuration.messages.colors.yellow,
				}],
			},
		});
		return false;
	}

	return new Promise((resolve) => {
		createModalComposer([client, bot], interaction, {
			modal: generateVerificationQuestionModal(guild, interaction.locale),
			onSubmit: async (submission, answers) => {
				const submitterReferenceId = stringifyValue(submitterDocument.ref);

				if (client.database.cache.entryRequestBySubmitterAndGuild.has(`${submitterReferenceId}${guild.id}`)) {
					sendInteractionResponse(bot, submission.id, submission.token, {
						type: InteractionResponseTypes.ChannelMessageWithSource,
						data: {
							flags: ApplicationCommandFlags.Ephemeral,
							embeds: [{
								description: localise(Services.entry.alreadySubmittedAnswers, submission.locale),
								color: configuration.messages.colors.darkRed,
							}],
						},
					});
					return true;
				}

				await sendInteractionResponse(bot, submission.id, submission.token, {
					type: InteractionResponseTypes.DeferredChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
					},
				});

				const entryRequest = await client.database.adapters.entryRequests.create(
					client,
					{
						submitter: submitterDocument.ref,
						guild: guild.id.toString(),
						answers,
						votedFor: [],
						votedAgainst: [],
						requestedRole: requestedRoleId.toString(),
						isFinalised: false,
					},
				);
				if (entryRequest === undefined) {
					displayVerifyError(bot, interaction);
					return false;
				}

				const verificationChannelId = verificationChannelIdByGuildId.get(guild.id)!;

				registerVerificationHandler(
					client,
					guild.id,
					verificationChannelId,
					[interaction.user.id, submitterDocument.ref],
				).then((isVerified) => resolve(isVerified));

				const messageId = await displayVerificationPrompt(
					bot,
					verificationChannelId,
					getVerificationPrompt(
						bot,
						guild,
						interaction.user,
						entryRequest.data,
						getNecessaryVotes(guild, entryRequest.data),
					),
				);

				entryRequestByMessageId.set(messageId, entryRequest);
				submitterIdByMessageId.set(messageId, interaction.user.id);
				messageIdBySubmitterAndGuild.set(`${submitterReferenceId}${guild.id}`, messageId);

				editOriginalInteractionResponse(bot, submission.token, {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: localise(Services.entry.answersSubmitted.header, interaction.locale),
						description: localise(Services.entry.answersSubmitted.body, interaction.locale),
						color: configuration.messages.colors.green,
					}],
				});

				return true;
			},
			onInvalid: () => new Promise((resolve) => resolve(undefined)),
		});
	});
}

function generateVerificationQuestionModal<T extends string>(
	guild: WithLanguage<Guild>,
	locale: string | undefined,
): Modal<T> {
	return {
		title: localise(Modals.verification.title, locale),
		fields: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				customId: 'reason',
				type: MessageComponentTypes.InputText,
				label: localise(Modals.verification.fields.reason, locale)(guild.language),
				style: TextStyles.Paragraph,
				required: true,
				minLength: 20,
				maxLength: 300,
			}],
		}, {
			type: MessageComponentTypes.ActionRow,
			components: [{
				customId: 'aim',
				type: MessageComponentTypes.InputText,
				label: localise(Modals.verification.fields.aim, locale),
				style: TextStyles.Paragraph,
				required: true,
				minLength: 20,
				maxLength: 300,
			}],
		}, {
			type: MessageComponentTypes.ActionRow,
			components: [{
				customId: 'where_found',
				type: MessageComponentTypes.InputText,
				label: localise(Modals.verification.fields.whereFound, locale)(guild.name),
				style: TextStyles.Short,
				required: true,
				minLength: 5,
				maxLength: 50,
			}],
		}],
	} as Modal<T>;
}

function displayVerifyError(bot: Bot, interaction: Interaction): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(Services.entry.failedToVerifyAccount, interaction.locale),
					color: configuration.messages.colors.red,
				}],
			},
		},
	);
}

function registerVerificationHandler(
	client: Client,
	guildId: bigint,
	channelId: bigint,
	[submitterId, submitterReference]: [bigint, Reference],
): Promise<boolean> {
	return new Promise((resolve) => {
		verificationPromptHandlers.set(`${submitterId}|${guildId}`, async (bot, selection) => {
			const isAccepted = await handleVote([client, bot], selection, [submitterId, submitterReference]);

			if (isAccepted === null) return;

			const submitterReferenceId = stringifyValue(submitterReference);

			const messageId = messageIdBySubmitterAndGuild.get(`${submitterReferenceId}${guildId}`);
			if (messageId === undefined) return;

			deleteMessage(bot, channelId, messageId);

			if (isAccepted === undefined) return;

			return resolve(isAccepted);
		});
	});
}

async function displayVerificationPrompt(
	bot: Bot,
	channelId: bigint,
	verificationPrompt: CreateMessage,
): Promise<bigint> {
	const message = await sendMessage(bot, channelId, verificationPrompt);
	return message.id;
}

type NecessaryVotes = [
	[requiredAcceptanceVotes: number, requiredRejectionVotes: number],
	[votesToAccept: number, votesToReject: number],
];

function getNecessaryVotes(guild: Guild, entryRequest: EntryRequest): NecessaryVotes {
	const moderatorRoleId = guild.roles.array()
		.find((role) => role.name === configuration.permissions.moderatorRoleName)?.id;
	const moderatorCount = moderatorRoleId !== undefined
		? guild.members.array().filter((member) => member.roles.includes(moderatorRoleId)).length
		: configuration.services.entry.verification.defaultVotesRequired;

	const requiredAcceptanceVotes = Math.max(
		1,
		Math.ceil(configuration.services.entry.verification.proportionVotesToAccept * moderatorCount),
	);
	const requiredRejectionVotes = Math.max(
		1,
		Math.ceil(configuration.services.entry.verification.proportionVotesToReject * moderatorCount),
	);

	const votesToAccept = requiredAcceptanceVotes - entryRequest.votedFor.length;
	const votesToReject = requiredRejectionVotes - entryRequest.votedAgainst.length;

	return [[requiredAcceptanceVotes, requiredRejectionVotes], [votesToAccept, votesToReject]];
}

function getVerificationPrompt(
	bot: Bot,
	guild: WithLanguage<Guild>,
	user: DiscordUser,
	entryRequest: EntryRequest,
	[[requiredAcceptanceVotes, requiredRejectionVotes], [votesToAccept, votesToReject]]: NecessaryVotes,
): CreateMessage {
	return {
		embeds: [{
			title: diagnosticMentionUser(user),
			thumbnail: (() => {
				const iconURL = getAvatarURL(bot, user.id, user.discriminator, {
					avatar: user.avatar,
					size: 64,
					format: 'webp',
				});
				if (iconURL === undefined) return;

				return { url: iconURL };
			})(),
			fields: [{
				name: localise(Modals.verification.fields.reason, defaultLocale)(guild.language),
				value: entryRequest.answers.reason!,
			}, {
				name: localise(Modals.verification.fields.aim, defaultLocale),
				value: entryRequest.answers.aim!,
			}, {
				name: localise(Modals.verification.fields.whereFound, defaultLocale)(guild.name),
				value: entryRequest.answers.where_found!,
			}],
			footer: {
				text: user.id.toString(),
			},
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.Button,
				style: ButtonStyles.Success,
				label: requiredAcceptanceVotes === 1
					? localise(Services.entry.vote.accept, defaultLocale)
					: localise(Services.entry.vote.acceptMultiple, defaultLocale)(votesToAccept),
				customId: `${staticComponentIds.verification}|${user.id}|${guild.id}|true`,
			}, {
				type: MessageComponentTypes.Button,
				style: ButtonStyles.Danger,
				label: requiredRejectionVotes === 1
					? localise(Services.entry.vote.reject, defaultLocale)
					: localise(Services.entry.vote.rejectMultiple, defaultLocale)(votesToReject),
				customId: `${staticComponentIds.verification}|${user.id}|${guild.id}|false`,
			}],
		}],
	};
}

async function handleVote(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	[submitterId, submitterReference]: [bigint, Reference],
): Promise<boolean | undefined | null> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) {
		displayVoteError(bot, interaction);
		return undefined;
	}

	const [voter, entryRequest] = await Promise.all([
		client.database.adapters.users.getOrFetchOrCreate(
			client,
			'id',
			interaction.user.id.toString(),
			interaction.user.id,
		),
		client.database.adapters.entryRequests.get(client, 'submitterAndGuild', [
			submitterReference,
			guild.id.toString(),
		]) as Document<EntryRequest> | undefined,
	]);
	if (voter === undefined || entryRequest === undefined) {
		displayVoteError(bot, interaction);
		return undefined;
	}

	const voterReferenceId = stringifyValue(voter.ref);

	const votedToAccept = entryRequest.data.votedFor.some((voterReference) =>
		stringifyValue(voterReference) === voterReferenceId
	);
	const votedToReject = entryRequest.data.votedAgainst.some((voterReference) =>
		stringifyValue(voterReference) === voterReferenceId
	);

	const isAccept = interaction.data!.customId!.split('|')[3]! === 'true';

	const [[_requiredAcceptanceVotes, requiredRejectionVotes], [votesToAccept, votesToReject]] = getNecessaryVotes(
		guild,
		entryRequest.data,
	);

	const updatedEntryRequest = lodash.cloneDeep(entryRequest) as Document<EntryRequest>;

	// If the voter has already voted to accept or to reject the user.
	if (votedToAccept || votedToReject) {
		// If the voter has already voted to accept, and is voting to accept again.
		if (votedToAccept && isAccept) {
			sendInteractionResponse(
				bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							description: localise(Services.entry.vote.alreadyVotedToAccept, interaction.locale),
							color: configuration.messages.colors.yellow,
						}],
					},
				},
			);
			return null;
			// If the voter has already voted to reject, and is voting to reject again.
		} else if (votedToReject && !isAccept) {
			sendInteractionResponse(
				bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							description: localise(Services.entry.vote.alreadyVotedToReject, interaction.locale),
							color: configuration.messages.colors.yellow,
						}],
					},
				},
			);
			return null;
		} else {
			if (isAccept) {
				const voterIndex = updatedEntryRequest.data.votedAgainst.findIndex((voterReference) =>
					stringifyValue(voterReference) === voterReferenceId
				);

				updatedEntryRequest.data.votedAgainst.splice(voterIndex, 1);
				updatedEntryRequest.data.votedFor.push(voter.ref);
			} else {
				const voterIndex = updatedEntryRequest.data.votedFor.findIndex((voterReference) =>
					stringifyValue(voterReference) === voterReferenceId
				);

				updatedEntryRequest.data.votedFor.splice(voterIndex, 1);
				updatedEntryRequest.data.votedAgainst.push(voter.ref);
			}

			sendInteractionResponse(
				bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							description: localise(Services.entry.vote.stanceOnVoteChanged, interaction.locale),
							color: configuration.messages.colors.green,
						}],
					},
				},
			);
		}
	} else {
		sendInteractionResponse(bot, interaction.id, interaction.token, {
			type: InteractionResponseTypes.DeferredUpdateMessage,
		});

		if (isAccept) {
			updatedEntryRequest.data.votedFor.push(voter.ref);
		} else {
			updatedEntryRequest.data.votedAgainst.push(voter.ref);
		}
	}

	const isAccepted = updatedEntryRequest.data.votedFor.length >= votesToAccept;
	const isRejected = updatedEntryRequest.data.votedAgainst.length >= votesToReject;

	if (isAccepted || isRejected) {
		updatedEntryRequest.data.isFinalised = true;
	}

	await client.database.adapters.entryRequests.update(client, updatedEntryRequest);

	const submitterReferenceId = stringifyValue(entryRequest.data.submitter);
	const compositeId = `${submitterReferenceId}${guild.id}`;

	const messageId = messageIdBySubmitterAndGuild.get(compositeId)!;

	entryRequestByMessageId.set(messageId, updatedEntryRequest);

	const submitterDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'reference',
		submitterReference,
		submitterId,
	);
	if (submitterDocument === undefined) {
		displayUserStateError(bot, interaction);
		return undefined;
	}

	if (!isAccepted && !isRejected) {
		return undefined;
	}

	const updatedSubmitterDocument = lodash.cloneDeep(submitterDocument) as Document<User>;

	const submitter = client.cache.users.get(submitterId)!;

	const dmChannel = await getDmChannel(bot, submitter.id).catch(() => undefined);

	if (isAccepted) {
		if (updatedSubmitterDocument.data.account.authorisedOn === undefined) {
			updatedSubmitterDocument.data.account.authorisedOn = [guild.id.toString()];
		} else {
			updatedSubmitterDocument.data.account.authorisedOn.push(guild.id.toString());
		}

		addRole(
			bot,
			guild.id,
			submitterId,
			BigInt(entryRequest.data.requestedRole),
			'User-requested role addition.',
		);

		client.log.info(`User with ID ${submitterDocument.data.account.id} has been accepted onto guild ${guild.name}.`);

		if (dmChannel !== undefined) {
			const entryRequestAcceptedString = localise(Services.entry.acceptedDirect, defaultLocale)(guild.name);

			sendMessage(bot, dmChannel.id, {
				embeds: [
					{
						author: guildAsAuthor(bot, guild),
						description: `🥳 ${entryRequestAcceptedString}`,
						color: configuration.messages.colors.green,
					},
				],
			});
		}
	} else if (isRejected) {
		if (updatedSubmitterDocument.data.account.rejectedOn === undefined) {
			updatedSubmitterDocument.data.account.rejectedOn = [guild.id.toString()];
		} else {
			updatedSubmitterDocument.data.account.rejectedOn.push(guild.id.toString());
		}

		client.log.info(`User with ID ${submitterDocument.data.account.id} has been rejected from guild ${guild.name}.`);

		if (dmChannel !== undefined) {
			const entryRequestRejectedString = localise(Services.entry.rejectedDirect, defaultLocale)(guild.name);

			await sendMessage(bot, dmChannel.id, {
				embeds: [
					{
						author: guildAsAuthor(bot, guild),
						description: `😕 ${entryRequestRejectedString}`,
						color: configuration.messages.colors.green,
					},
				],
			});
		}

		banMember(bot, guild.id, submitter.id, {
			reason: `${
				requiredRejectionVotes - votesToReject
			} guide(s) voted against this particular user being granted entry.`,
		});
	}

	await client.database.adapters.users.update(client, updatedSubmitterDocument);

	verificationPromptHandlers.delete(`${submitterDocument.data.account.id}|${guild.id}`);

	log(
		[client, bot],
		guild,
		isAccepted ? 'verificationRequestAccept' : 'verificationRequestReject',
		submitter,
		interaction.member!,
	);

	return isRejected ? false : isAccepted;
}

function displayVoteError(bot: Bot, interaction: Interaction): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(Services.entry.vote.failed, interaction.locale),
					color: configuration.messages.colors.red,
				}],
			},
		},
	);
}

function displayUserStateError(bot: Bot, interaction: Interaction): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: localise(Services.entry.vote.failedToUpdateVerificationState, interaction.locale),
					color: configuration.messages.colors.red,
				}],
			},
		},
	);
}

export default service;
export { initiateVerificationProcess };
