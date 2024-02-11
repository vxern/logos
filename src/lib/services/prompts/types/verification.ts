import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale, getLocalisationLanguageByLocale } from "../../../../constants/languages";
import { MentionTypes, TimestampFormat, mention, timestamp } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client } from "../../../client";
import { openTicket } from "../../../commands/server/commands/ticket/open";
import { EntryRequest } from "../../../database/entry-request";
import { User } from "../../../database/user";
import diagnostics from "../../../diagnostics";
import {
	acknowledge,
	createInteractionCollector,
	decodeId,
	deleteReply,
	editReply,
	encodeId,
	getLocaleData,
	postponeReply,
	reply,
} from "../../../interactions";
import { getGuildIconURLFormatted, snowflakeToTimestamp } from "../../../utils";
import { Configurations, PromptService } from "../service";

type InteractionData = [documentId: string, isAccept: string];

type Configuration = Configurations["verification"];
type VoteInformation = {
	[K in keyof NonNullable<Configuration["voting"]>["verdict"]]: {
		required: number;
		remaining: number;
	};
};

class VerificationService extends PromptService<"verification", EntryRequest, InteractionData> {
	private readonly collectingInquiryInteractions: Promise<void>;
	private stopCollectingInquiryInteractions: (() => void) | undefined;

	constructor(client: Client, guildId: bigint) {
		super(client, guildId, { type: "verification", deleteMode: "none" });

		this.collectingInquiryInteractions = new Promise((resolve) => {
			this.stopCollectingInquiryInteractions = () => resolve();
		});
	}

	async start(): Promise<void> {
		await super.start();

		createInteractionCollector(this.client, {
			type: Discord.InteractionTypes.MessageComponent,
			customId: `${constants.components.createInquiry}/${this.guildId}`,
			doesNotExpire: true,
			onCollect: async (selection) => {
				const customId = selection.data?.customId;
				if (customId === undefined) {
					return;
				}

				const [_, compositeId] = decodeId(customId);
				if (compositeId === undefined) {
					return;
				}

				this.handleOpenInquiry(selection, compositeId);
			},
			end: this.collectingInquiryInteractions,
		});
	}

	async stop(): Promise<void> {
		await super.stop();

		this.stopCollectingInquiryInteractions?.();
		await this.collectingInquiryInteractions;
	}

	getAllDocuments(): Map<string, EntryRequest> {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return new Map();
		}

		// TODO(vxern): Find less error-prone way of querying for members.
		const member = this.client.entities.members.get(
			Discord.snowflakeToBigint(`${this.client.bot.id}${this.guildIdString}`),
		);
		if (member === undefined) {
			return new Map();
		}

		const guild = this.guild;
		if (guild === undefined) {
			return new Map();
		}

		const entryRequests: Map<string, EntryRequest> = new Map();

		for (const [compositeId, entryRequestDocument] of this.client.documents.entryRequests) {
			if (entryRequestDocument.guildId !== this.guildIdString) {
				continue;
			}

			if (entryRequestDocument.isFinalised) {
				continue;
			}

			const voteInformation = this.getVoteInformation(entryRequestDocument);
			if (voteInformation === undefined) {
				continue;
			}

			const [isAccepted, isRejected] = [
				voteInformation.acceptance.remaining === 0,
				voteInformation.rejection.remaining === 0,
			];
			if (isAccepted || isRejected) {
				const submitter = this.client.entities.users.get(BigInt(entryRequestDocument.authorId));
				if (submitter === undefined) {
					continue;
				}

				// unawaited
				this.getUserDocument(entryRequestDocument).then((authorDocument) => {
					if (authorDocument === undefined) {
						return;
					}

					this.finalise(
						entryRequestDocument,
						authorDocument,
						configuration,
						[submitter, member, guild],
						[isAccepted, isRejected],
					);
				});

				continue;
			}

			entryRequests.set(compositeId, entryRequestDocument);
		}

		return entryRequests;
	}

	async getUserDocument(entryRequestDocument: EntryRequest): Promise<User | undefined> {
		const session = this.client.database.openSession();

		const userDocument =
			this.client.documents.users.get(entryRequestDocument.authorId) ??
			session.get<User>(`users/${entryRequestDocument.authorId}`).then((value) => value ?? undefined);

		session.dispose();

		return userDocument;
	}

	getPromptContent(user: Logos.User, entryRequestDocument: EntryRequest): Discord.CreateMessageOptions | undefined {
		const [guild, guildDocument] = [this.guild, this.guildDocument];
		if (guild === undefined || guildDocument === undefined) {
			return undefined;
		}

		const voteInformation = this.getVoteInformation(entryRequestDocument);
		if (voteInformation === undefined) {
			return undefined;
		}

		const guildLocale = this.guildLocale;
		const guildLanguage = getLocalisationLanguageByLocale(guildLocale);

		const strings = {
			requestedRoles: this.client.localise("entry.verification.requestedRoles", guildLocale)(),
			accountCreated: this.client.localise("entry.verification.accountCreated", guildLocale)(),
			answersSubmitted: this.client.localise("entry.verification.answersSubmitted", guildLocale)(),
			votesFor: this.client.localise("entry.verification.votesFor", guildLocale)(),
			votesAgainst: this.client.localise("entry.verification.votesAgainst", guildLocale)(),
			noneYet: this.client.localise("entry.verification.noneYet", guildLocale)(),
			accept: this.client.localise("entry.verification.vote.accept", guildLocale)(),
			acceptMultiple: this.client.localise(
				"entry.verification.vote.acceptMultiple",
				guildLocale,
			)({
				votes: this.client.pluralise(
					"entry.verification.vote.acceptMultiple.votes",
					guildLanguage,
					voteInformation.acceptance.remaining,
				),
			}),
			reject: this.client.localise("entry.verification.vote.reject", guildLocale)(),
			rejectMultiple: this.client.localise(
				"entry.verification.vote.rejectMultiple",
				guildLocale,
			)({
				votes: this.client.pluralise(
					"entry.verification.vote.rejectMultiple.votes",
					guildLanguage,
					voteInformation.rejection.remaining,
				),
			}),
			inquiry: this.client.localise("entry.verification.inquiry.inquiry", guildLocale)(),
			open: this.client.localise("entry.verification.inquiry.open", guildLocale)(),
		};

		const accountCreatedRelativeTimestamp = timestamp(snowflakeToTimestamp(user.id), TimestampFormat.Relative);
		const accountCreatedLongDateTimestamp = timestamp(snowflakeToTimestamp(user.id), TimestampFormat.LongDate);

		const votedForFormatted = entryRequestDocument.votedFor?.map((userId) => mention(userId, MentionTypes.User));
		const votedAgainstFormatted = entryRequestDocument.votedAgainst?.map((userId) =>
			mention(userId, MentionTypes.User),
		);

		return {
			embeds: [
				{
					color: constants.colors.murrey,
					thumbnail: (() => {
						const iconURL = Discord.avatarUrl(user.id, user.discriminator, {
							avatar: user.avatar,
							size: 128,
							format: "webp",
						});
						if (iconURL === undefined) {
							return;
						}

						return { url: iconURL };
					})(),
					fields: [
						{
							name: diagnostics.display.user(user),
							value:
								`1. *${entryRequestDocument.answers.reason}*\n` +
								`2. *${entryRequestDocument.answers.aim}*\n` +
								`3. *${entryRequestDocument.answers.whereFound}*`,
							inline: false,
						},
						{
							name: strings.requestedRoles,
							value: mention(BigInt(entryRequestDocument.requestedRoleId), MentionTypes.Role),
							inline: true,
						},
						{
							name: strings.answersSubmitted,
							value: timestamp(entryRequestDocument.createdAt, TimestampFormat.Relative),
							inline: true,
						},
						{
							name: strings.accountCreated,
							value: `${accountCreatedLongDateTimestamp} (${accountCreatedRelativeTimestamp})`,
							inline: true,
						},
						{
							name: `${constants.symbols.verification.for} ${strings.votesFor}`,
							value:
								votedForFormatted !== undefined && votedForFormatted.length !== 0
									? votedForFormatted.join("\n")
									: `*${strings.noneYet}*`,
							inline: true,
						},
						{
							name: `${constants.symbols.verification.against} ${strings.votesAgainst}`,
							value:
								votedAgainstFormatted !== undefined && votedAgainstFormatted.length !== 0
									? votedAgainstFormatted.join("\n")
									: `*${strings.noneYet}*`,
							inline: true,
						},
					],
					footer: {
						text: guild.name,
						iconUrl: `${getGuildIconURLFormatted(guild)}&metadata=${entryRequestDocument.guildId}/${
							entryRequestDocument.authorId
						}`,
					},
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							style: Discord.ButtonStyles.Success,
							label: voteInformation.acceptance.remaining === 1 ? strings.accept : strings.acceptMultiple,
							customId: encodeId<InteractionData>(constants.components.verification, [
								`${entryRequestDocument.guildId}/${entryRequestDocument.authorId}`,
								`${true}`,
							]),
						},
						{
							type: Discord.MessageComponentTypes.Button,
							style: Discord.ButtonStyles.Danger,
							label: voteInformation.rejection.remaining === 1 ? strings.reject : strings.rejectMultiple,
							customId: encodeId<InteractionData>(constants.components.verification, [
								`${entryRequestDocument.guildId}/${entryRequestDocument.authorId}`,
								`${false}`,
							]),
						},
						...((entryRequestDocument.ticketChannelId === undefined
							? [
									{
										type: Discord.MessageComponentTypes.Button,
										style: Discord.ButtonStyles.Primary,
										label: strings.open,
										customId: encodeId(`${constants.components.createInquiry}/${this.guildId}`, [
											`${entryRequestDocument.guildId}/${entryRequestDocument.authorId}`,
										]),
									},
							  ]
							: []) as Discord.ButtonComponent[]),
					] as [Discord.ButtonComponent, Discord.ButtonComponent],
				},
			],
		};
	}

	async handleInteraction(
		interaction: Discord.Interaction,
		data: InteractionData,
	): Promise<EntryRequest | null | undefined> {
		const localeData = await getLocaleData(this.client, interaction);
		const locale = localeData.locale;

		const configuration = this.configuration;
		if (configuration === undefined || !configuration.enabled) {
			return undefined;
		}

		const [compositeId, isAcceptString] = data;
		const isAccept = isAcceptString === "true";

		const [guildId, userId] = compositeId.split("/");
		if (guildId === undefined || userId === undefined) {
			return undefined;
		}

		const member = interaction.member;
		if (member === undefined) {
			return undefined;
		}

		const guild = this.client.entities.guilds.get(BigInt(guildId));
		if (guild === undefined) {
			this.displayVoteError(interaction, { locale });
			return undefined;
		}

		const session = this.client.database.openSession();

		const [authorDocument, voterDocument, entryRequestDocument] = await Promise.all([
			this.client.documents.users.get(userId) ??
				(await session.get<User>(`users/${userId}`).then((value) => value ?? undefined)) ??
				(async () => {
					const userDocument = {
						...({
							id: `users/${userId}`,
							account: { id: userId },
							createdAt: Date.now(),
						} satisfies User),
						"@metadata": { "@collection": "Users" },
					};
					await session.set(userDocument);
					await session.saveChanges();

					return userDocument as User;
				})(),
			this.client.documents.users.get(interaction.user.id.toString()) ??
				(await session.get<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
				(async () => {
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
				})(),
			this.client.documents.entryRequests.get(`${guildId}/${userId}`),
		]);

		session.dispose();

		if (voterDocument === undefined || entryRequestDocument === undefined) {
			this.displayVoteError(interaction, { locale });
			return undefined;
		}

		const [alreadyVotedToAccept, alreadyVotedToReject] = [
			entryRequestDocument.votedFor ?? [],
			entryRequestDocument.votedAgainst ?? [],
		].map((voterIds) => voterIds.some((voterId) => voterId === voterDocument.account.id)) as [boolean, boolean];

		const voteInformation = this.getVoteInformation(entryRequestDocument);
		if (voteInformation === undefined) {
			return undefined;
		}

		const [votedFor, votedAgainst] = [
			[...(entryRequestDocument.votedFor ?? [])],
			[...(entryRequestDocument.votedAgainst ?? [])],
		];

		const submitter = this.client.entities.users.get(BigInt(authorDocument.account.id));
		if (submitter === undefined) {
			return undefined;
		}

		const management = configuration.management;

		const roleIds = management?.roles?.map((roleId) => BigInt(roleId));
		const userIds = management?.users?.map((userId) => BigInt(userId));

		// If the voter has already voted to accept or to reject the user.
		if (alreadyVotedToAccept || alreadyVotedToReject) {
			// If the voter has already voted to accept, and is voting to accept again.
			if (alreadyVotedToAccept && isAccept) {
				const isAuthorised =
					member.roles.some((roleId) => roleIds?.includes(roleId) ?? false) ||
					(userIds?.includes(interaction.user.id) ?? false);

				if (isAuthorised) {
					const strings = {
						title: this.client.localise("entry.verification.vote.sureToForce.accept.title", locale)(),
						description: this.client.localise("entry.verification.vote.sureToForce.accept.description", locale)(),
						yes: this.client.localise("entry.verification.vote.sureToForce.yes", locale)(),
						no: this.client.localise("entry.verification.vote.sureToForce.no", locale)(),
					};

					const promise = new Promise<null | undefined>((resolve) => {
						const confirmCustomId = createInteractionCollector(this.client, {
							type: Discord.InteractionTypes.MessageComponent,
							userId: interaction.user.id,
							limit: 1,
							onCollect: async (_) => {
								deleteReply(this.client, interaction);

								if (entryRequestDocument.isFinalised) {
									resolve(undefined);
									return;
								}

								await this.finalise(
									entryRequestDocument,
									authorDocument,
									configuration,
									[submitter, member, guild],
									[true, false],
								);

								resolve(null);
							},
						});

						const cancelCustomId = createInteractionCollector(this.client, {
							type: Discord.InteractionTypes.MessageComponent,
							userId: interaction.user.id,
							limit: 1,
							onCollect: async (_) => {
								deleteReply(this.client, interaction);

								resolve(undefined);
							},
						});

						reply(this.client, interaction, {
							embeds: [{ title: strings.title, description: strings.description, color: constants.colors.peach }],
							components: [
								{
									type: Discord.MessageComponentTypes.ActionRow,
									components: [
										{
											type: Discord.MessageComponentTypes.Button,
											customId: confirmCustomId,
											label: strings.yes,
											style: Discord.ButtonStyles.Success,
										},
										{
											type: Discord.MessageComponentTypes.Button,
											customId: cancelCustomId,
											label: strings.no,
											style: Discord.ButtonStyles.Danger,
										},
									],
								},
							],
						});
					});

					return promise;
				}

				const strings = {
					title: this.client.localise("entry.verification.vote.alreadyVoted.inFavour.title", locale)(),
					description: this.client.localise("entry.verification.vote.alreadyVoted.inFavour.description", locale)(),
				};

				reply(this.client, interaction, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.dullYellow,
						},
					],
				});

				return undefined;
			}

			// If the voter has already voted to reject, and is voting to reject again.
			if (alreadyVotedToReject && !isAccept) {
				const isAuthorised =
					member.roles.some((roleId) => roleIds?.includes(roleId) ?? false) ||
					(userIds?.includes(interaction.user.id) ?? false);

				if (isAuthorised) {
					const strings = {
						title: this.client.localise("entry.verification.vote.sureToForce.reject.title", locale)(),
						description: this.client.localise("entry.verification.vote.sureToForce.reject.description", locale)(),
						yes: this.client.localise("entry.verification.vote.sureToForce.yes", locale)(),
						no: this.client.localise("entry.verification.vote.sureToForce.no", locale)(),
					};

					const promise = new Promise<null | undefined>((resolve) => {
						const confirmCustomId = createInteractionCollector(this.client, {
							type: Discord.InteractionTypes.MessageComponent,
							userId: interaction.user.id,
							limit: 1,
							onCollect: async (_) => {
								deleteReply(this.client, interaction);

								if (entryRequestDocument.isFinalised) {
									resolve(undefined);
									return;
								}

								await this.finalise(
									entryRequestDocument,
									authorDocument,
									configuration,
									[submitter, member, guild],
									[false, true],
								);

								resolve(null);
							},
						});

						const cancelCustomId = createInteractionCollector(this.client, {
							type: Discord.InteractionTypes.MessageComponent,
							userId: interaction.user.id,
							limit: 1,
							onCollect: async (_) => {
								deleteReply(this.client, interaction);

								resolve(undefined);
							},
						});

						reply(this.client, interaction, {
							embeds: [{ title: strings.title, description: strings.description, color: constants.colors.peach }],
							components: [
								{
									type: Discord.MessageComponentTypes.ActionRow,
									components: [
										{
											type: Discord.MessageComponentTypes.Button,
											customId: confirmCustomId,
											label: strings.yes,
											style: Discord.ButtonStyles.Success,
										},
										{
											type: Discord.MessageComponentTypes.Button,
											customId: cancelCustomId,
											label: strings.no,
											style: Discord.ButtonStyles.Danger,
										},
									],
								},
							],
						});
					});

					return promise;
				}

				const strings = {
					title: this.client.localise("entry.verification.vote.alreadyVoted.against.title", locale)(),
					description: this.client.localise("entry.verification.vote.alreadyVoted.against.description", locale)(),
				};

				reply(this.client, interaction, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.dullYellow,
						},
					],
				});

				return undefined;
			}

			if (isAccept) {
				const voterIndex = votedAgainst.findIndex((voterId) => voterId === voterDocument.account.id);

				votedAgainst.splice(voterIndex, 1);
				votedFor.push(voterDocument.account.id);
			} else {
				const voterIndex = votedFor.findIndex((voterId) => voterId === voterDocument.account.id);

				votedFor.splice(voterIndex, 1);
				votedAgainst.push(voterDocument.account.id);
			}

			const strings = {
				title: this.client.localise("entry.verification.vote.stanceChanged.title", locale)(),
				description: this.client.localise("entry.verification.vote.stanceChanged.description", locale)(),
			};

			reply(this.client, interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.lightGreen,
					},
				],
			});
		} else {
			acknowledge(this.client, interaction);

			if (isAccept) {
				votedFor.push(voterDocument.account.id);
			} else {
				votedAgainst.push(voterDocument.account.id);
			}
		}

		const [isAccepted, isRejected] = [
			votedFor.length >= voteInformation.acceptance.required,
			votedAgainst.length >= voteInformation.rejection.required,
		];

		if (votedFor.length !== 0) {
			entryRequestDocument.votedFor = votedFor;
		} else {
			entryRequestDocument.votedFor = undefined;
		}

		if (votedAgainst.length !== 0) {
			entryRequestDocument.votedAgainst = votedAgainst;
		} else {
			entryRequestDocument.votedAgainst = undefined;
		}

		if (isAccepted || isRejected) {
			await this.finalise(
				entryRequestDocument,
				authorDocument,
				configuration,
				[submitter, member, guild],
				[isAccepted, isRejected],
			);

			return null;
		}

		return entryRequestDocument;
	}

	private async finalise(
		entryRequestDocument: EntryRequest,
		authorDocument: User,
		configuration: Configuration,
		[submitter, member, guild]: [Logos.User, Logos.Member, Logos.Guild],
		[isAccepted, isRejected]: [boolean, boolean],
	): Promise<void> {
		let isFinalised = false;

		if (isAccepted || isRejected) {
			isFinalised = true;

			if (configuration.journaling) {
				const journallingService = this.client.getJournallingService(this.guildId);

				if (isAccepted) {
					journallingService?.log("entryRequestAccept", { args: [submitter, member] });
				} else {
					journallingService?.log("entryRequestReject", { args: [submitter, member] });
				}
			}
		}

		if (entryRequestDocument.ticketChannelId !== undefined) {
			const ticketService = this.client.getPromptService(this.guildId, { type: "tickets" });
			if (ticketService !== undefined) {
				// unawaited
				ticketService.handleDelete(
					`${entryRequestDocument.guildId}/${entryRequestDocument.authorId}/${entryRequestDocument.ticketChannelId}`,
				);
			}
		}

		{
			const session = this.client.database.openSession();

			entryRequestDocument.ticketChannelId = undefined;
			entryRequestDocument.isFinalised = isFinalised;

			await session.set(entryRequestDocument);
			await session.saveChanges();

			session.dispose();
		}

		let authorisedOn =
			authorDocument.account.authorisedOn !== undefined ? [...authorDocument.account.authorisedOn] : undefined;
		let rejectedOn =
			authorDocument.account.rejectedOn !== undefined ? [...authorDocument.account.rejectedOn] : undefined;

		if (isAccepted) {
			if (authorisedOn === undefined) {
				authorisedOn = [this.guildIdString];
			} else if (!authorisedOn.includes(this.guildIdString)) {
				authorisedOn.push(this.guildIdString);
			}

			this.client.log.info(
				`Accepted ${diagnostics.display.user(authorDocument.account.id)} onto ${diagnostics.display.guild(guild)}.`,
			);

			this.client.bot.rest
				.addRole(
					this.guildId,
					submitter.id,
					BigInt(entryRequestDocument.requestedRoleId),
					"User-requested role addition.",
				)
				.catch(() =>
					this.client.log.warn(
						`Failed to add ${diagnostics.display.role(
							entryRequestDocument.requestedRoleId,
						)} to ${diagnostics.display.user(authorDocument.account.id)} on ${diagnostics.display.guild(guild)}.`,
					),
				);
		} else if (isRejected) {
			if (rejectedOn === undefined) {
				rejectedOn = [this.guildIdString];
			} else if (!rejectedOn.includes(this.guildIdString)) {
				rejectedOn.push(this.guildIdString);
			}

			this.client.log.info(
				`Rejected ${diagnostics.display.user(authorDocument.account.id)} from ${diagnostics.display.guild(guild)}.`,
			);

			this.client.bot.rest
				.banMember(this.guildId, submitter.id, {}, "Voted to reject entry request.")
				.catch(() =>
					this.client.log.warn(
						`Failed to ban ${diagnostics.display.user(authorDocument.account.id)} on ${diagnostics.display.guild(
							guild,
						)}.`,
					),
				);
		}

		{
			const session = this.client.database.openSession();

			authorDocument.account.authorisedOn = authorisedOn;
			authorDocument.account.rejectedOn = rejectedOn;

			await session.set(authorDocument);
			await session.saveChanges();

			session.dispose();
		}
	}

	private async handleOpenInquiry(interaction: Discord.Interaction, compositeId: string): Promise<void> {
		await postponeReply(this.client, interaction);

		const [configuration, guild, guildDocument] = [this.configuration, this.guild, this.guildDocument];
		if (configuration === undefined || guild === undefined || guildDocument === undefined) {
			return;
		}

		const ticketConfiguration = guildDocument.features.server.features?.tickets;
		if (ticketConfiguration === undefined || !ticketConfiguration.enabled) {
			return;
		}

		const entryRequestDocument = this.client.documents.entryRequests.get(compositeId);
		if (entryRequestDocument === undefined) {
			return;
		}

		if (entryRequestDocument.ticketChannelId !== undefined) {
			return;
		}

		const userDocument = await this.getUserDocument(entryRequestDocument);
		if (userDocument === undefined) {
			return;
		}

		const user = this.client.entities.users.get(BigInt(userDocument.account.id));
		if (user === undefined) {
			return;
		}

		const member = this.client.entities.members.get(Discord.snowflakeToBigint(`${interaction.user.id}${guild.id}`));
		if (member === undefined) {
			return;
		}

		const strings = {
			inquiryChannel: this.client.localise(
				"entry.verification.inquiry.channel",
				this.guildLocale,
			)({ user: user.username }),
		};

		const result = await openTicket(
			this.client,
			configuration,
			{ topic: strings.inquiryChannel },
			[guild, user, member, userDocument],
			ticketConfiguration.categoryId,
			"inquiry",
			{ guildLocale: this.guildLocale },
		);
		if (typeof result === "string") {
			const strings = {
				title: this.client.localise("entry.verification.inquiry.failed.title", this.guildLocale)(),
				description: this.client.localise("entry.verification.inquiry.failed.description", this.guildLocale)(),
			};

			editReply(this.client, interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.peach,
					},
				],
			});

			return;
		}

		const session = this.client.database.openSession();

		entryRequestDocument.ticketChannelId = result.channelId;

		await session.set(entryRequestDocument);
		await session.saveChanges();

		session.saveChanges();

		const prompt = this.promptByCompositeId.get(`${entryRequestDocument.guildId}/${entryRequestDocument.authorId}`);
		if (prompt === undefined) {
			return;
		}

		await this.client.bot.rest.deleteMessage(prompt.channelId, prompt.id).catch(() => {
			this.client.log.warn("Failed to delete prompt.");
		});

		{
			const strings = {
				title: this.client.localise("entry.verification.inquiry.opened.title", this.guildLocale)(),
				description: this.client.localise(
					"entry.verification.inquiry.opened.description",
					this.guildLocale,
				)({
					guild_name: guild.name,
				}),
			};

			editReply(this.client, interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.lightGreen,
					},
				],
			});
		}
	}

	private getVoteInformation(entryRequest: EntryRequest): VoteInformation | undefined {
		const [configuration, guild] = [this.configuration, this.guild];
		if (configuration === undefined || guild === undefined) {
			return undefined;
		}

		if (!configuration.enabled) {
			return undefined;
		}

		const roleIds = guild.roles
			.filter((role) => configuration.voting.roles.includes(role.id.toString()))
			.map((role) => role.id);
		const userIds = configuration.voting.users?.map((userId) => BigInt(userId));

		const voterCount = guild.members
			.filter((member) => userIds?.includes(member.id) || roleIds.some((roleId) => member.roles.includes(roleId)))
			.filter((member) => !member.user?.toggles?.has("bot"))
			.array().length;

		function getVoteInformation<VerdictType extends keyof VoteInformation>(
			type: VerdictType,
			configuration: Configurations["verification"] & { enabled: true },
			votes: number,
		): VoteInformation[VerdictType] {
			const verdict = configuration.voting.verdict[type];

			switch (verdict.type) {
				case "fraction": {
					const required = Math.max(1, Math.ceil(verdict.value * voterCount));
					const remaining = Math.max(0, required - votes);
					return { required, remaining };
				}
				case "number": {
					const required = Math.max(1, verdict.value);
					const remaining = Math.max(0, required - votes);
					return { required, remaining };
				}
			}
		}

		const acceptance = getVoteInformation("acceptance", configuration, entryRequest.votedFor?.length ?? 0);
		const rejection = getVoteInformation("rejection", configuration, entryRequest.votedAgainst?.length ?? 0);

		return { acceptance, rejection };
	}

	private async displayVoteError(interaction: Discord.Interaction, { locale }: { locale: Locale }): Promise<void> {
		const strings = {
			title: this.client.localise("entry.verification.vote.failed.title", locale)(),
			description: this.client.localise("entry.verification.vote.failed.description", locale)(),
		};

		reply(this.client, interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});
	}
}

export { VerificationService };
