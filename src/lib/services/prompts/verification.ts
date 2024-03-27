import { Locale } from "logos:constants/languages";
import diagnostics from "logos:core/diagnostics";
import { mention, timestamp } from "logos:core/formatting";
import { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { openTicket } from "logos/commands/handlers/ticket/open";
import { EntryRequest } from "logos/database/entry-request";
import { Model } from "logos/database/model";
import { Ticket } from "logos/database/ticket";
import { User } from "logos/database/user";
import { Configurations, PromptService } from "logos/services/prompts/service";

type Configuration = NonNullable<Configurations["verification"]>;
type VoteInformation = {
	[K in keyof NonNullable<Configuration["voting"]>["verdict"]]: {
		required: number;
		remaining: number;
	};
};

class VerificationPromptService extends PromptService<{
	type: "verification";
	model: EntryRequest;
	metadata: [partialId: string, isAccept: string];
}> {
	readonly #_openInquiry: InteractionCollector<[partialId: string]>;

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "VerificationPromptService", guildId }, { type: "verification", deleteMode: "none" });

		this.#_openInquiry = new InteractionCollector(client, {
			guildId,
			customId: InteractionCollector.encodeCustomId([constants.components.createInquiry]),
			isPermanent: true,
		});
	}

	async start(): Promise<void> {
		await super.start();

		this.#_openInquiry.onCollect(async (selection) => {
			await this.#handleOpenInquiry(selection, selection.metadata[1]);
		});

		await this.client.registerInteractionCollector(this.#_openInquiry);
	}

	async stop(): Promise<void> {
		await super.stop();

		this.#_openInquiry.close();
	}

	getAllDocuments(): Map<string, EntryRequest> {
		const configuration = this.configuration;
		if (configuration === undefined) {
			return new Map();
		}

		const member = this.client.entities.members.get(this.guildId)?.get(this.client.bot.id);
		if (member === undefined) {
			return new Map();
		}

		const guild = this.guild;
		if (guild === undefined) {
			return new Map();
		}

		const entryRequests: Map<string, EntryRequest> = new Map();

		for (const [partialId, entryRequestDocument] of this.client.documents.entryRequests) {
			if (entryRequestDocument.guildId !== this.guildIdString) {
				continue;
			}

			if (entryRequestDocument.isFinalised) {
				continue;
			}

			const voteInformation = this.#getVoteInformation(entryRequestDocument);
			if (voteInformation === undefined) {
				continue;
			}

			const [isAccepted, isRejected] = [
				voteInformation.acceptance.remaining === 0,
				voteInformation.rejection.remaining === 0,
			];
			if (isAccepted || isRejected) {
				const author = this.client.entities.users.get(BigInt(entryRequestDocument.authorId));
				if (author === undefined) {
					continue;
				}

				this.getUserDocument(entryRequestDocument).then((authorDocument) => {
					if (authorDocument === undefined) {
						return;
					}

					this.#finalise(entryRequestDocument, configuration, [author, member, guild], [isAccepted, isRejected]);
				});

				continue;
			}

			entryRequests.set(partialId, entryRequestDocument);
		}

		return entryRequests;
	}

	async getUserDocument(entryRequestDocument: EntryRequest): Promise<User> {
		return await User.getOrCreate(this.client, { userId: entryRequestDocument.authorId });
	}

	getPromptContent(user: Logos.User, entryRequestDocument: EntryRequest): Discord.CreateMessageOptions | undefined {
		const [guild, guildDocument] = [this.guild, this.guildDocument];
		if (guild === undefined || guildDocument === undefined) {
			return undefined;
		}

		const voteInformation = this.#getVoteInformation(entryRequestDocument);
		if (voteInformation === undefined) {
			return undefined;
		}

		const guildLocale = this.guildLocale;

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
				votes: this.client.pluralise("entry.verification.vote.acceptMultiple.votes", guildLocale, {
					quantity: voteInformation.acceptance.remaining,
				}),
			}),
			reject: this.client.localise("entry.verification.vote.reject", guildLocale)(),
			rejectMultiple: this.client.localise(
				"entry.verification.vote.rejectMultiple",
				guildLocale,
			)({
				votes: this.client.pluralise("entry.verification.vote.rejectMultiple.votes", guildLocale, {
					quantity: voteInformation.rejection.remaining,
				}),
			}),
			inquiry: this.client.localise("entry.verification.inquiry.inquiry", guildLocale)(),
			open: this.client.localise("entry.verification.inquiry.open", guildLocale)(),
		};

		const accountCreatedRelativeTimestamp = timestamp(Discord.snowflakeToTimestamp(user.id), { format: "relative" });
		const accountCreatedLongDateTimestamp = timestamp(Discord.snowflakeToTimestamp(user.id), { format: "long-date" });

		const votedForFormatted = entryRequestDocument.votedFor?.map((userId) => mention(userId, { type: "user" }));
		const votedAgainstFormatted = entryRequestDocument.votedAgainst?.map((userId) => mention(userId, { type: "user" }));

		return {
			embeds: [
				{
					color: constants.colours.murrey,
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
							value: mention(BigInt(entryRequestDocument.requestedRoleId), { type: "role" }),
							inline: true,
						},
						{
							name: strings.answersSubmitted,
							value: timestamp(entryRequestDocument.createdAt, { format: "relative" }),
							inline: true,
						},
						{
							name: strings.accountCreated,
							value: `${accountCreatedLongDateTimestamp} (${accountCreatedRelativeTimestamp})`,
							inline: true,
						},
						{
							name: `${constants.emojis.verification.for} ${strings.votesFor}`,
							value:
								votedForFormatted !== undefined && votedForFormatted.length !== 0
									? votedForFormatted.join("\n")
									: `*${strings.noneYet}*`,
							inline: true,
						},
						{
							name: `${constants.emojis.verification.against} ${strings.votesAgainst}`,
							value:
								votedAgainstFormatted !== undefined && votedAgainstFormatted.length !== 0
									? votedAgainstFormatted.join("\n")
									: `*${strings.noneYet}*`,
							inline: true,
						},
					],
					footer: {
						text: guild.name,
						iconUrl: `${Discord.guildIconUrl(guild.id, guild.icon)}&metadata=${entryRequestDocument.partialId}`,
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
							customId: this.magicButton.encodeId([entryRequestDocument.partialId, `${true}`]),
						},
						{
							type: Discord.MessageComponentTypes.Button,
							style: Discord.ButtonStyles.Danger,
							label: voteInformation.rejection.remaining === 1 ? strings.reject : strings.rejectMultiple,
							customId: this.magicButton.encodeId([entryRequestDocument.partialId, `${false}`]),
						},
						...((entryRequestDocument.ticketChannelId === undefined
							? [
									{
										type: Discord.MessageComponentTypes.Button,
										style: Discord.ButtonStyles.Primary,
										label: strings.open,
										customId: this.removeButton.encodeId([entryRequestDocument.partialId]),
									},
							  ]
							: []) as Discord.ButtonComponent[]),
					] as [Discord.ButtonComponent, Discord.ButtonComponent],
				},
			],
		};
	}

	async handlePromptInteraction(
		interaction: Logos.Interaction<[partialId: string, isAccept: string]>,
	): Promise<EntryRequest | null | undefined> {
		const locale = interaction.locale;

		const configuration = this.configuration;
		if (configuration === undefined) {
			return undefined;
		}

		const [guildId, userId] = interaction.metadata[0].split("/");
		if (guildId === undefined || userId === undefined) {
			return undefined;
		}

		const isAccept = interaction.metadata[1] === "true";

		const member = interaction.member;
		if (member === undefined) {
			return undefined;
		}

		const guild = this.client.entities.guilds.get(BigInt(guildId));
		if (guild === undefined) {
			await this.#displayVoteError(interaction, { locale });
			return undefined;
		}

		const entryRequestDocument = this.client.documents.entryRequests.get(
			Model.buildPartialId<EntryRequest>({ guildId, authorId: userId }),
		);
		if (entryRequestDocument === undefined) {
			await this.#displayVoteError(interaction, { locale });
			return undefined;
		}

		const [alreadyVotedToAccept, alreadyVotedToReject] = [
			entryRequestDocument.votedFor ?? [],
			entryRequestDocument.votedAgainst ?? [],
		].map((voterIds) => voterIds.some((voterId) => voterId === interaction.user.id.toString())) as [boolean, boolean];

		const voteInformation = this.#getVoteInformation(entryRequestDocument);
		if (voteInformation === undefined) {
			return undefined;
		}

		const [votedFor, votedAgainst] = [
			[...(entryRequestDocument.votedFor ?? [])],
			[...(entryRequestDocument.votedAgainst ?? [])],
		];

		const author = this.client.entities.users.get(BigInt(userId));
		if (author === undefined) {
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

					const { promise, resolve } = Promise.withResolvers<null | undefined>();

					const confirmButton = new InteractionCollector(this.client, { only: [interaction.user.id], isSingle: true });
					const cancelButton = new InteractionCollector(this.client, { only: [interaction.user.id], isSingle: true });

					confirmButton.onCollect(async (_) => {
						await this.client.deleteReply(interaction);

						if (entryRequestDocument.isFinalised) {
							resolve(undefined);
							return;
						}

						await this.#finalise(entryRequestDocument, configuration, [author, member, guild], [true, false]);

						resolve(null);
					});

					cancelButton.onCollect(async (_) => {
						await this.client.deleteReply(interaction);

						resolve(undefined);
					});

					await this.client.registerInteractionCollector(confirmButton);
					await this.client.registerInteractionCollector(cancelButton);

					await this.client.pushback(interaction, {
						embeds: [
							{
								title: strings.title,
								description: strings.description,
							},
						],
						components: [
							{
								type: Discord.MessageComponentTypes.ActionRow,
								components: [
									{
										type: Discord.MessageComponentTypes.Button,
										customId: confirmButton.customId,
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

					return promise;
				}

				const strings = {
					title: this.client.localise("entry.verification.vote.alreadyVoted.inFavour.title", locale)(),
					description: this.client.localise("entry.verification.vote.alreadyVoted.inFavour.description", locale)(),
				};

				await this.client.warning(interaction, {
					title: strings.title,
					description: strings.description,
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

					const { promise, resolve } = Promise.withResolvers<null | undefined>();

					const confirmButton = new InteractionCollector(this.client, { only: [interaction.user.id], isSingle: true });
					const cancelButton = new InteractionCollector(this.client, { only: [interaction.user.id], isSingle: true });

					confirmButton.onCollect(async (_) => {
						await this.client.deleteReply(interaction);

						if (entryRequestDocument.isFinalised) {
							resolve(undefined);
							return;
						}

						await this.#finalise(entryRequestDocument, configuration, [author, member, guild], [false, true]);

						resolve(null);
					});

					cancelButton.onCollect(async (_) => {
						await this.client.deleteReply(interaction);

						resolve(undefined);
					});

					await this.client.registerInteractionCollector(confirmButton);
					await this.client.registerInteractionCollector(cancelButton);

					await this.client.pushback(interaction, {
						embeds: [
							{
								title: strings.title,
								description: strings.description,
							},
						],
						components: [
							{
								type: Discord.MessageComponentTypes.ActionRow,
								components: [
									{
										type: Discord.MessageComponentTypes.Button,
										customId: confirmButton.customId,
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

					return promise;
				}

				const strings = {
					title: this.client.localise("entry.verification.vote.alreadyVoted.against.title", locale)(),
					description: this.client.localise("entry.verification.vote.alreadyVoted.against.description", locale)(),
				};

				await this.client.warning(interaction, {
					title: strings.title,
					description: strings.description,
				});

				return undefined;
			}

			if (isAccept) {
				const voterIndex = votedAgainst.findIndex((voterId) => voterId === interaction.user.id.toString());

				votedAgainst.splice(voterIndex, 1);
				votedFor.push(interaction.user.id.toString());
			} else {
				const voterIndex = votedFor.findIndex((voterId) => voterId === interaction.user.id.toString());

				votedFor.splice(voterIndex, 1);
				votedAgainst.push(interaction.user.id.toString());
			}

			const strings = {
				title: this.client.localise("entry.verification.vote.stanceChanged.title", locale)(),
				description: this.client.localise("entry.verification.vote.stanceChanged.description", locale)(),
			};

			await this.client.notice(interaction, {
				title: strings.title,
				description: strings.description,
			});
		} else {
			await this.client.acknowledge(interaction);

			if (isAccept) {
				votedFor.push(interaction.user.id.toString());
			} else {
				votedAgainst.push(interaction.user.id.toString());
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
			await this.#finalise(entryRequestDocument, configuration, [author, member, guild], [isAccepted, isRejected]);

			return null;
		}

		return entryRequestDocument;
	}

	// TODO(vxern): Improve how authorised.
	async #finalise(
		entryRequestDocument: EntryRequest,
		_configuration: Configuration,
		[author, voter, guild]: [Logos.User, Logos.Member, Logos.Guild],
		[isAccepted, isRejected]: [boolean, boolean],
	): Promise<void> {
		const authorDocument = await User.getOrCreate(this.client, { userId: author.id.toString() });

		let isFinalised = false;

		if (isAccepted || isRejected) {
			isFinalised = true;

			if (isAccepted) {
				await this.client.tryLog("entryRequestAccept", { guildId: guild.id, args: [author, voter] });
			} else {
				await this.client.tryLog("entryRequestReject", { guildId: guild.id, args: [author, voter] });
			}
		}

		if (entryRequestDocument.ticketChannelId !== undefined) {
			const ticketService = this.client.getPromptService(this.guildId, { type: "tickets" });
			if (ticketService !== undefined) {
				const [ticketDocument] = await Ticket.getAll(this.client, {
					where: { channelId: entryRequestDocument.ticketChannelId },
				});
				if (ticketDocument === undefined) {
					throw "StateError: Unable to find ticket document.";
				}

				await ticketService.handleDelete(ticketDocument);
			}
		}

		await entryRequestDocument.update(this.client, () => {
			entryRequestDocument.ticketChannelId = undefined;
			entryRequestDocument.isFinalised = isFinalised;
		});

		if (isAccepted) {
			await authorDocument.update(this.client, () => {
				authorDocument.setAuthorisationStatus({ guildId: this.guildIdString, status: "authorised" });
			});

			this.log.info(
				`Accepted ${diagnostics.display.user(authorDocument.account.id)} onto ${diagnostics.display.guild(guild)}.`,
			);

			this.client.bot.rest
				.addRole(this.guildId, author.id, BigInt(entryRequestDocument.requestedRoleId), "User-requested role addition.")
				.catch(() =>
					this.log.warn(
						`Failed to add ${diagnostics.display.role(
							entryRequestDocument.requestedRoleId,
						)} to ${diagnostics.display.user(authorDocument.account.id)} on ${diagnostics.display.guild(guild)}.`,
					),
				);
		} else if (isRejected) {
			await authorDocument.update(this.client, () => {
				authorDocument.setAuthorisationStatus({ guildId: this.guildIdString, status: "rejected" });
			});

			this.log.info(
				`Rejected ${diagnostics.display.user(authorDocument.account.id)} from ${diagnostics.display.guild(guild)}.`,
			);

			this.client.bot.rest
				.banMember(this.guildId, author.id, {}, "Voted to reject entry request.")
				.catch(() =>
					this.log.warn(
						`Failed to ban ${diagnostics.display.user(authorDocument.account.id)} on ${diagnostics.display.guild(
							guild,
						)}.`,
					),
				);
		}
	}

	async #handleOpenInquiry(interaction: Logos.Interaction, partialId: string): Promise<void> {
		await this.client.postponeReply(interaction);

		const [configuration, guild, guildDocument] = [this.configuration, this.guild, this.guildDocument];
		if (configuration === undefined || guild === undefined || guildDocument === undefined) {
			return;
		}

		const ticketConfiguration = guildDocument.tickets;
		if (ticketConfiguration === undefined) {
			return;
		}

		const entryRequestDocument = this.client.documents.entryRequests.get(partialId);
		if (entryRequestDocument === undefined) {
			return;
		}

		if (entryRequestDocument.ticketChannelId !== undefined) {
			return;
		}

		const user = this.client.entities.users.get(BigInt(entryRequestDocument.authorId));
		if (user === undefined) {
			return;
		}

		const member = this.client.entities.members.get(guild.id)?.get(interaction.user.id);
		if (member === undefined) {
			return;
		}

		const strings = {
			inquiryChannel: this.client.localise(
				"entry.verification.inquiry.channel",
				this.guildLocale,
			)({ user: user.username }),
		};

		const ticketDocument = await openTicket(
			this.client,
			configuration,
			{ topic: strings.inquiryChannel },
			[guild, user, member],
			ticketConfiguration.categoryId,
			"inquiry",
			{ guildLocale: this.guildLocale },
		);
		if (ticketDocument === undefined) {
			const strings = {
				title: this.client.localise("entry.verification.inquiry.failed.title", this.guildLocale)(),
				description: this.client.localise("entry.verification.inquiry.failed.description", this.guildLocale)(),
			};

			await this.client.failed(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return;
		}

		await entryRequestDocument.update(this.client, () => {
			entryRequestDocument.ticketChannelId = ticketDocument.channelId;
		});

		const prompt = this.promptByPartialId.get(entryRequestDocument.partialId);
		if (prompt === undefined) {
			return;
		}

		await this.client.bot.rest
			.deleteMessage(prompt.channelId, prompt.id)
			.catch(() => this.log.warn("Failed to delete prompt."));

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

			await this.client.succeeded(interaction, {
				title: strings.title,
				description: strings.description,
			});
		}
	}

	#getVoteInformation(entryRequest: EntryRequest): VoteInformation | undefined {
		const [configuration, guild] = [this.configuration, this.guild];
		if (configuration === undefined || guild === undefined) {
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

	async #displayVoteError(interaction: Logos.Interaction, { locale }: { locale: Locale }): Promise<void> {
		const strings = {
			title: this.client.localise("entry.verification.vote.failed.title", locale)(),
			description: this.client.localise("entry.verification.vote.failed.description", locale)(),
		};

		await this.client.failure(interaction, {
			title: strings.title,
			description: strings.description,
		});
	}
}

export { VerificationPromptService };
