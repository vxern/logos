import {
	addRole,
	banMember,
	Bot,
	ButtonStyles,
	calculatePermissions,
	CreateMessage,
	deleteMessage,
	getAvatarURL,
	Guild,
	Interaction,
	InteractionTypes,
	Message,
	MessageComponentTypes,
	sendMessage,
	TextStyles,
	User as DiscordUser,
} from 'discordeno';
import { lodash } from 'lodash';
import { logEvent } from 'logos/src/controllers/logging/logging.ts';
import { EntryRequest, User } from 'logos/src/database/structs/mod.ts';
import { Document, Reference } from 'logos/src/database/document.ts';
import { stringifyValue } from 'logos/src/database/database.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client, extendEventHandler, localise, WithLanguage } from 'logos/src/client.ts';
import {
	acknowledge,
	createInteractionCollector,
	createModalComposer,
	decodeId,
	editReply,
	encodeId,
	InteractionCollectorSettings,
	Modal,
	postponeReply,
	reply,
} from 'logos/src/interactions.ts';
import { diagnosticMentionUser, getAllMessages, getTextChannel } from 'logos/src/utils.ts';
import { defaultLocale } from 'logos/types.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { trim } from 'logos/formatting.ts';

const verificationPromptHandlers = new Map<string, NonNullable<InteractionCollectorSettings['onCollect']>>();

const service: ServiceStarter = ([client, bot]) => {
	setupVoteHandler([client, bot]);
	registerPastEntryRequests([client, bot]);
	ensureVerificationPromptPersistence([client, bot]);
};

function setupVoteHandler([client, bot]: [Client, Bot]): void {
	createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		customId: constants.staticComponentIds.verification,
		doesNotExpire: true,
		onCollect: (_, selection) => {
			const [__, userId, guildId, ___] = decodeId<VerificationPromptButtonID>(selection.data!.customId!);

			const handle = verificationPromptHandlers.get([userId, guildId].join(constants.symbols.meta.idSeparator));
			if (handle === undefined) return;

			return void handle(bot, selection);
		},
	});
}

interface VerificationPromptMetadata {
	submitterId: bigint;
}

function extractMetadata(prompt: Message): VerificationPromptMetadata | undefined {
	const metadata = prompt.embeds.at(0)?.footer?.text;
	if (metadata === undefined) return undefined;

	const [userId] = metadata.split(constants.symbols.meta.metadataSeparator);
	if (userId === undefined) return undefined;

	return { submitterId: BigInt(userId) };
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

	extendEventHandler(bot, 'guildCreate', { append: true }, async (bot, { id: guildId }) => {
		const guild = client.cache.guilds.get(guildId)!;

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

		const verificationPromptsAll = await getAllMessages([client, bot], verificationChannelId) ?? [];
		const verificationPrompts = getValidPrompts(bot, verificationPromptsAll);
		const verificationPromptBySubmitterId = new Map(
			verificationPrompts.map((prompt) => [extractMetadata(prompt)!.submitterId, prompt]),
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

				messageId = await sendMessage(
					bot,
					verificationChannelId,
					getVerificationPrompt(
						[client, bot],
						guild,
						submitter,
						entryRequest.data,
						getNecessaryVotes(guild, entryRequest.data),
					),
				).then((message) => message.id);
			} else {
				messageId = prompt.id;
			}

			entryRequestByMessageId.set(messageId, entryRequest);
			submitterIdByMessageId.set(messageId, submitterId);
			messageIdBySubmitterAndGuild.set(`${submitterReferenceId}${guild.id}`, messageId);

			registerVerificationHandler(client, guild.id, verificationChannelId, [submitterId, submitterDocument.ref]);
		}

		// These are the prompts which aren't connected to any entry request.
		const remainingVerificationPrompts = verificationPromptBySubmitterId.values();
		for (const prompt of remainingVerificationPrompts) {
			deleteMessage(bot, prompt.channelId, prompt.id);
		}
	});
}

function ensureVerificationPromptPersistence([client, bot]: [Client, Bot]): void {
	// Anti-tampering feature; detects verification prompts being deleted.
	extendEventHandler(bot, 'messageDelete', { prepend: true }, async (bot, { id, channelId, guildId }) => {
		// If the message was deleted from any other channel apart from a verification channel.
		if (verificationChannelIdByGuildId.get(guildId!) !== channelId) {
			return;
		}

		const entryRequest = entryRequestByMessageId.get(id);
		if (entryRequest === undefined || entryRequest.data.isFinalised) return;

		const submitterId = submitterIdByMessageId.get(id);
		if (submitterId === undefined) return;

		const submitter = client.cache.users.get(submitterId);
		if (submitter === undefined) return;

		const guild = client.cache.guilds.get(guildId!)!;

		const newMessageId = await sendMessage(
			bot,
			channelId,
			getVerificationPrompt(
				[client, bot],
				guild,
				submitter,
				entryRequest.data,
				getNecessaryVotes(guild, entryRequest.data),
			),
		).then((message) => message.id);
		entryRequestByMessageId.delete(id);
		submitterIdByMessageId.delete(id);
		entryRequestByMessageId.set(newMessageId, entryRequest);
		submitterIdByMessageId.set(newMessageId, submitterId);

		const submitterReferenceId = stringifyValue(entryRequest.data.submitter);
		const compositeId = `${submitterReferenceId}${guild.id}`;

		messageIdBySubmitterAndGuild.delete(compositeId);
		messageIdBySubmitterAndGuild.set(compositeId, newMessageId);
	});

	// Anti-tampering feature; detects embeds being deleted from verification prompts.
	extendEventHandler(bot, 'messageUpdate', { prepend: true }, (bot, { id, channelId, guildId, embeds }, _) => {
		// If the message was updated in any other channel apart from a verification channel.
		if (verificationChannelIdByGuildId.get(guildId!) !== channelId) {
			return;
		}

		// If the embed is still present, it wasn't an embed having been deleted. Do not do anything.
		if (embeds.length === 1) return;

		// Delete the message and allow the bot to handle the deletion.
		deleteMessage(bot, channelId, id);
	});
}

enum VerificationError {
	Failure = 'failure',
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
	if (submitterDocument === undefined) return false;

	const entryRequest = client.database.adapters.entryRequests.get(
		client,
		'submitterAndGuild',
		[submitterDocument.ref, guild.id.toString()],
	);
	if (entryRequest !== undefined) {
		const strings = {
			title: localise(client, 'entry.verification.answers.alreadyAnswered.title', interaction.locale)(),
			description: localise(client, 'entry.verification.answers.alreadyAnswered.description', interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});

		return false;
	}

	return new Promise((resolve) => {
		createModalComposer([client, bot], interaction, {
			modal: generateVerificationQuestionModal(client, guild, interaction.locale),
			onSubmit: async (submission, answers) => {
				const submitterReferenceId = stringifyValue(submitterDocument.ref);

				if (client.database.cache.entryRequestBySubmitterAndGuild.has(`${submitterReferenceId}${guild.id}`)) {
					const strings = {
						title: localise(client, 'entry.verification.answers.alreadyAnswered.title', interaction.locale)(),
						description: localise(
							client,
							'entry.verification.answers.alreadyAnswered.description',
							interaction.locale,
						)(),
					};

					reply([client, bot], submission, {
						embeds: [{
							title: strings.title,
							description: strings.description,
							color: constants.colors.darkRed,
						}],
					});

					return true;
				}

				await postponeReply([client, bot], submission);

				const entryRequest = await client.database.adapters.entryRequests.create(
					client,
					{
						createdAt: Date.now(),
						submitter: submitterDocument.ref,
						guild: guild.id.toString(),
						answers,
						votedFor: [],
						votedAgainst: [],
						requestedRole: requestedRoleId.toString(),
						isFinalised: false,
					},
				);
				if (entryRequest === undefined) return VerificationError.Failure;

				const verificationChannelId = verificationChannelIdByGuildId.get(guild.id)!;

				registerVerificationHandler(
					client,
					guild.id,
					verificationChannelId,
					[interaction.user.id, submitterDocument.ref],
				).then((isVerified) => resolve(isVerified));

				const messageId = await sendMessage(
					bot,
					verificationChannelId,
					getVerificationPrompt(
						[client, bot],
						guild,
						interaction.user,
						entryRequest.data,
						getNecessaryVotes(guild, entryRequest.data),
					),
				).then((message) => message.id);

				entryRequestByMessageId.set(messageId, entryRequest);
				submitterIdByMessageId.set(messageId, interaction.user.id);
				messageIdBySubmitterAndGuild.set(`${submitterReferenceId}${guild.id}`, messageId);

				logEvent([client, bot], guild, 'entryRequestSubmit', [interaction.user, entryRequest.data]);

				const strings = {
					title: localise(client, 'entry.verification.answers.submitted.title', interaction.locale)(),
					description: {
						submitted: localise(
							client,
							'entry.verification.answers.submitted.description.submitted',
							interaction.locale,
						)(),
						willBeReviewed: localise(
							client,
							'entry.verification.answers.submitted.description.willBeReviewed',
							interaction.locale,
						)(),
					},
				};

				editReply([client, bot], submission, {
					embeds: [{
						title: strings.title,
						description: `${strings.description.submitted}\n\n${strings.description.willBeReviewed}`,
						color: constants.colors.lightGreen,
					}],
				});

				return true;
			},
			// deno-lint-ignore require-await
			onInvalid: async (submission, error) => {
				switch (error) {
					case VerificationError.Failure:
					default: {
						const strings = {
							title: localise(client, 'entry.verification.answers.failed.title', interaction.locale)(),
							description: localise(client, 'entry.verification.answers.failed.description', interaction.locale)(),
						};

						editReply([client, bot], submission, {
							embeds: [{
								title: strings.title,
								description: strings.description,
								color: constants.colors.red,
							}],
						});

						return undefined;
					}
				}
			},
		});
	});
}

function generateVerificationQuestionModal<T extends string>(
	client: Client,
	guild: WithLanguage<Guild>,
	locale: string | undefined,
): Modal<T> {
	const strings = {
		title: localise(client, 'verification.title', locale)(),
		reason: localise(client, 'verification.fields.reason', locale)({ 'language': guild.language }),
		aim: localise(client, 'verification.fields.aim', locale)(),
		whereFound: localise(client, 'verification.fields.whereFound', locale)(),
	};

	return {
		title: strings.title,
		fields: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				customId: 'reason',
				type: MessageComponentTypes.InputText,
				label: trim(strings.reason, 45),
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
				label: trim(strings.aim, 45),
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
				label: trim(strings.whereFound, 45),
				style: TextStyles.Short,
				required: true,
				minLength: 5,
				maxLength: 50,
			}],
		}],
	} as Modal<T>;
}

function registerVerificationHandler(
	client: Client,
	guildId: bigint,
	channelId: bigint,
	[submitterId, submitterReference]: [bigint, Reference],
): Promise<boolean> {
	return new Promise((resolve) => {
		verificationPromptHandlers.set(
			[submitterId, guildId].join(constants.symbols.meta.idSeparator),
			async (bot, selection) => {
				const isAccepted = await handleVote([client, bot], selection, [submitterId, submitterReference]);
				if (isAccepted === null) return;

				const submitterReferenceId = stringifyValue(submitterReference);

				const messageId = messageIdBySubmitterAndGuild.get(`${submitterReferenceId}${guildId}`);
				if (messageId === undefined) return;

				deleteMessage(bot, channelId, messageId);

				if (isAccepted === undefined) return;

				return resolve(isAccepted);
			},
		);
	});
}

type NecessaryVotes = [
	[requiredAcceptanceVotes: number, requiredRejectionVotes: number],
	[votesToAccept: number, votesToReject: number],
];

function getNecessaryVotes(guild: Guild, entryRequest: EntryRequest): NecessaryVotes {
	const moderatorRoleIds = guild.roles
		.array()
		.filter((role) => calculatePermissions(role.permissions).includes('MODERATE_MEMBERS'))
		.map((role) => role.id);
	const moderatorCount = moderatorRoleIds.length !== 0
		? guild.members.array().filter((member) =>
			moderatorRoleIds.some((roleId) => member.roles.includes(roleId)) && !member.user?.toggles.bot &&
			member.user?.username !== guild.name
		)
			.length
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

type VerificationPromptButtonID = [userId: string, guildId: string, isResolved: string];

function getVerificationPrompt(
	[client, bot]: [Client, Bot],
	guild: WithLanguage<Guild>,
	user: DiscordUser,
	entryRequest: EntryRequest,
	[[requiredAcceptanceVotes, requiredRejectionVotes], [votesToAccept, votesToReject]]: NecessaryVotes,
): CreateMessage {
	const strings = {
		verification: {
			reason: localise(client, 'verification.fields.reason', defaultLocale)({ 'language': guild.language }),
			aim: localise(client, 'verification.fields.aim', defaultLocale)(),
			whereFound: localise(client, 'verification.fields.whereFound', defaultLocale)(),
		},
		accept: localise(client, 'entry.verification.vote.accept', defaultLocale)(),
		acceptMultiple: localise(client, 'entry.verification.vote.acceptMultiple', defaultLocale)({
			'number': votesToAccept,
		}),
		reject: localise(client, 'entry.verification.vote.reject', defaultLocale)(),
		rejectMultiple: localise(client, 'entry.verification.vote.rejectMultiple', defaultLocale)({
			'number': votesToReject,
		}),
	};

	return {
		embeds: [{
			title: diagnosticMentionUser(user),
			color: constants.colors.turquoise,
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
				name: strings.verification.reason,
				value: entryRequest.answers.reason!,
			}, {
				name: strings.verification.aim,
				value: entryRequest.answers.aim!,
			}, {
				name: strings.verification.whereFound,
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
				label: requiredAcceptanceVotes === 1 ? strings.accept : strings.acceptMultiple,
				customId: encodeId<VerificationPromptButtonID>(
					constants.staticComponentIds.reports,
					[user.id.toString(), guild.id.toString(), `${true}`],
				),
			}, {
				type: MessageComponentTypes.Button,
				style: ButtonStyles.Danger,
				label: requiredRejectionVotes === 1 ? strings.reject : strings.rejectMultiple,
				customId: encodeId<VerificationPromptButtonID>(
					constants.staticComponentIds.reports,
					[user.id.toString(), guild.id.toString(), `${false}`],
				),
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
		displayVoteError([client, bot], interaction);
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
		displayVoteError([client, bot], interaction);
		return undefined;
	}

	const voterReferenceId = stringifyValue(voter.ref);

	const votedToAccept = entryRequest.data.votedFor.some((voterReference) =>
		stringifyValue(voterReference) === voterReferenceId
	);
	const votedToReject = entryRequest.data.votedAgainst.some((voterReference) =>
		stringifyValue(voterReference) === voterReferenceId
	);

	const isAccept = decodeId<VerificationPromptButtonID>(interaction.data!.customId!)[3] === 'true';

	const [[_, requiredRejectionVotes], [votesToAccept, votesToReject]] = getNecessaryVotes(
		guild,
		entryRequest.data,
	);

	const updatedEntryRequest = lodash.cloneDeep(entryRequest) as Document<EntryRequest>;

	// If the voter has already voted to accept or to reject the user.
	if (votedToAccept || votedToReject) {
		// If the voter has already voted to accept, and is voting to accept again.
		if (votedToAccept && isAccept) {
			const strings = {
				title: localise(client, 'entry.verification.vote.inFavour.title', interaction.locale)(),
				description: localise(client, 'entry.verification.vote.inFavour.description', interaction.locale)(),
			};

			reply([client, bot], interaction, {
				embeds: [{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				}],
			});

			return null;
			// If the voter has already voted to reject, and is voting to reject again.
		} else if (votedToReject && !isAccept) {
			const strings = {
				title: localise(client, 'entry.verification.vote.alreadyVoted.against.title', interaction.locale)(),
				description: localise(client, 'entry.verification.vote.alreadyVoted.against.description', interaction.locale)(),
			};

			reply([client, bot], interaction, {
				embeds: [{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				}],
			});

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

			const strings = {
				title: localise(client, 'entry.verification.vote.stanceChanged.title', interaction.locale)(),
				description: localise(client, 'entry.verification.vote.stanceChanged.description', interaction.locale)(),
			};

			reply([client, bot], interaction, {
				embeds: [{
					title: strings.title,
					description: strings.description,
					color: constants.colors.lightGreen,
				}],
			});
		}
	} else {
		acknowledge([client, bot], interaction);

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

	const updatedEntryRequestDocument = await client.database.adapters.entryRequests.update(client, updatedEntryRequest);
	if (updatedEntryRequestDocument === undefined) return undefined;

	const submitterReferenceId = stringifyValue(entryRequest.data.submitter);
	const compositeId = `${submitterReferenceId}${guild.id}`;

	const messageId = messageIdBySubmitterAndGuild.get(compositeId)!;

	entryRequestByMessageId.set(messageId, updatedEntryRequestDocument);

	const submitterDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'reference',
		submitterReference,
		submitterId,
	);
	if (submitterDocument === undefined) {
		displayUserStateError([client, bot], interaction);
		return undefined;
	}

	if (!isAccepted && !isRejected) {
		return undefined;
	}

	const updatedSubmitterDocument = lodash.cloneDeep(submitterDocument) as Document<User>;

	const submitter = client.cache.users.get(submitterId)!;

	if (isAccepted) {
		if (updatedSubmitterDocument.data.account.authorisedOn === undefined) {
			updatedSubmitterDocument.data.account.authorisedOn = [guild.id.toString()];
		} else {
			updatedSubmitterDocument.data.account.authorisedOn.push(guild.id.toString());
		}

		client.log.info(`User with ID ${submitterDocument.data.account.id} has been accepted onto guild ${guild.name}.`);

		addRole(
			bot,
			guild.id,
			submitterId,
			BigInt(entryRequest.data.requestedRole),
			'User-requested role addition.',
		).catch(() =>
			client.log.warn(
				`Failed to add role with ID ${entryRequest.data.requestedRole} to submitter with ID ${submitterId} in guild with ID ${guild.id}.`,
			)
		);
	} else if (isRejected) {
		if (updatedSubmitterDocument.data.account.rejectedOn === undefined) {
			updatedSubmitterDocument.data.account.rejectedOn = [guild.id.toString()];
		} else {
			updatedSubmitterDocument.data.account.rejectedOn.push(guild.id.toString());
		}

		client.log.info(`User with ID ${submitterDocument.data.account.id} has been rejected from guild ${guild.name}.`);

		banMember(bot, guild.id, submitter.id, {
			reason: `${
				requiredRejectionVotes - votesToReject
			} guide(s) voted against this particular user being granted entry.`,
		}).catch(() => client.log.warn(`Failed to ban member with ID ${submitter.id} on guild with ID ${guild.id}.`));
	}

	await client.database.adapters.users.update(client, updatedSubmitterDocument);

	verificationPromptHandlers.delete(
		[submitterDocument.data.account.id, guild.id].join(constants.symbols.meta.idSeparator),
	);

	logEvent(
		[client, bot],
		guild,
		isAccepted ? 'entryRequestAccept' : 'entryRequestReject',
		[submitter, interaction.member!],
	);

	return isRejected ? false : isAccepted;
}

function displayVoteError([client, bot]: [Client, Bot], interaction: Interaction): void {
	const strings = {
		title: localise(client, 'entry.verification.vote.failed.title', interaction.locale)(),
		description: localise(client, 'entry.verification.vote.failed.description', interaction.locale)(),
	};

	return void reply([client, bot], interaction, {
		embeds: [{
			title: strings.title,
			description: strings.description,
			color: constants.colors.red,
		}],
	});
}

function displayUserStateError([client, bot]: [Client, Bot], interaction: Interaction): void {
	const strings = {
		title: localise(client, 'entry.verification.vote.stateUpdateFailed.title', interaction.locale)(),
		description: localise(client, 'entry.verification.vote.stateUpdateFailed.description', interaction.locale)(),
	};

	return void reply([client, bot], interaction, {
		embeds: [{
			title: strings.title,
			description: strings.description,
			color: constants.colors.red,
		}],
	});
}

export default service;
export { initiateVerificationProcess };
