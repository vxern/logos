import { Locale } from "logos:constants/languages";
import diagnostics from "logos:core/diagnostics";
import { mention, timestamp } from "logos:core/formatting";
import { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { EntryRequest, VoteType } from "logos/database/entry-request";
import { Guild } from "logos/database/guild";
import { Model } from "logos/database/model";
import { Ticket } from "logos/database/ticket";
import { User } from "logos/database/user";
import { PromptService } from "logos/services/prompts/service";

type Configuration = NonNullable<Guild["verification"]>;
type VoteInformation = {
	[K in keyof NonNullable<Configuration["voting"]>["verdict"]]: {
		required: number;
		remaining: number;
	};
};

// TODO(vxern): Reduce code duplication.
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
		this.#_openInquiry.onCollect(async (selection) => {
			await this.#handleOpenInquiry(selection, selection.metadata[1]);
		});

		await this.client.registerInteractionCollector(this.#_openInquiry);

		await super.start();
	}

	async stop(): Promise<void> {
		this.#_openInquiry.close();

		await super.stop();
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

			const verdict = entryRequestDocument.getVerdict({
				requiredFor: voteInformation.acceptance.required,
				requiredAgainst: voteInformation.rejection.required,
			});
			if (verdict === undefined) {
				continue;
			}

			this.getUserDocument(entryRequestDocument).then((authorDocument) => {
				if (authorDocument === undefined) {
					return;
				}

				this.#tryFinalise({ entryRequestDocument, voter: member });
			});

			entryRequests.set(partialId, entryRequestDocument);
		}

		return entryRequests;
	}

	async getUserDocument(entryRequestDocument: EntryRequest): Promise<User> {
		return await User.getOrCreate(this.client, { userId: entryRequestDocument.authorId });
	}

	getPromptContent(user: Logos.User, entryRequestDocument: EntryRequest): Discord.CreateMessageOptions | undefined {
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

		const votedForFormatted = entryRequestDocument.votersFor.map((userId) => mention(userId, { type: "user" }));
		const votedAgainstFormatted = entryRequestDocument.votersAgainst.map((userId) => mention(userId, { type: "user" }));

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
								`1. *${entryRequestDocument.formData.reason}*\n` +
								`2. *${entryRequestDocument.formData.aim}*\n` +
								`3. *${entryRequestDocument.formData.whereFound}*`,
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
						text: this.guild.name,
						iconUrl: PromptService.encodePartialIdInGuildIcon({
							guild: this.guild,
							partialId: entryRequestDocument.partialId,
						}),
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

		const newVote: VoteType = interaction.metadata[1] === "true" ? "for" : "against";

		const voter = interaction.member;
		if (voter === undefined) {
			return undefined;
		}

		const entryRequestDocument = this.client.documents.entryRequests.get(
			Model.buildPartialId<EntryRequest>({ guildId, authorId: userId }),
		);
		if (entryRequestDocument === undefined) {
			await this.#displayVoteError(interaction, { locale });
			return undefined;
		}

		const currentVote = entryRequestDocument.getUserVote({ userId: interaction.user.id.toString() });

		const management = configuration.management;

		const roleIds = management?.roles?.map((roleId) => BigInt(roleId));
		const userIds = management?.users?.map((userId) => BigInt(userId));

		if (currentVote === "for" && newVote === "for") {
			const isAuthorised =
				voter.roles.some((roleId) => roleIds?.includes(roleId) ?? false) ||
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

					await entryRequestDocument.update(this.client, () => {
						entryRequestDocument.forceVerdict({ userId: interaction.user.id.toString(), verdict: "accepted" });
					});

					await this.#tryFinalise({ entryRequestDocument, voter });

					resolve(null);
				});

				cancelButton.onCollect(async (_) => {
					await this.client.deleteReply(interaction);

					resolve(undefined);
				});

				confirmButton.onDone(() => resolve(undefined));
				cancelButton.onDone(() => resolve(undefined));

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

		if (currentVote === "against" && newVote === "against") {
			const isAuthorised =
				voter.roles.some((roleId) => roleIds?.includes(roleId) ?? false) ||
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

					await entryRequestDocument.update(this.client, () => {
						entryRequestDocument.forceVerdict({ userId: interaction.user.id.toString(), verdict: "rejected" });
					});

					await this.#tryFinalise({ entryRequestDocument, voter });

					resolve(null);
				});

				cancelButton.onCollect(async (_) => {
					await this.client.deleteReply(interaction);

					resolve(undefined);
				});

				confirmButton.onDone(() => resolve(undefined));
				cancelButton.onDone(() => resolve(undefined));

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

		await entryRequestDocument.update(this.client, () => {
			entryRequestDocument.addVote({ userId: interaction.user.id.toString(), vote: newVote });
		});

		if (currentVote !== undefined) {
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
		}

		const isFinalised = await this.#tryFinalise({ entryRequestDocument, voter });
		if (isFinalised) {
			return null;
		}

		return entryRequestDocument;
	}

	async #tryFinalise({
		entryRequestDocument,
		voter,
	}: {
		entryRequestDocument: EntryRequest;
		voter: Logos.Member;
	}): Promise<boolean> {
		const guild = this.client.entities.guilds.get(this.guildId);
		if (guild === undefined) {
			return false;
		}

		const author = this.client.entities.users.get(BigInt(entryRequestDocument.authorId));
		if (author === undefined) {
			return false;
		}

		const authorDocument = await User.getOrCreate(this.client, { userId: entryRequestDocument.authorId });

		const voteInformation = this.#getVoteInformation(entryRequestDocument);
		if (voteInformation === undefined) {
			return false;
		}

		const verdict = entryRequestDocument.getVerdict({
			requiredFor: voteInformation.acceptance.required,
			requiredAgainst: voteInformation.rejection.required,
		});
		if (verdict === undefined) {
			return false;
		}

		await entryRequestDocument.update(this.client, () => {
			entryRequestDocument.isFinalised = true;
		});

		if (verdict === "accepted") {
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

			await this.client.tryLog("entryRequestAccept", { guildId: guild.id, args: [author, voter] });
		} else if (verdict === "rejected") {
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

			await this.client.tryLog("entryRequestReject", { guildId: guild.id, args: [author, voter] });
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

				await entryRequestDocument.update(this.client, () => {
					entryRequestDocument.ticketChannelId = undefined;
				});
			}
		}

		return true;
	}

	async #handleOpenInquiry(interaction: Logos.Interaction, partialId: string): Promise<void> {
		await this.client.postponeReply(interaction);

		const [configuration] = [this.configuration];
		if (configuration === undefined) {
			return;
		}

		const ticketConfiguration = this.guildDocument.tickets;
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

		const entryRequestAuthor = this.client.entities.users.get(BigInt(entryRequestDocument.authorId));
		if (entryRequestAuthor === undefined) {
			return;
		}

		const strings = {
			inquiryChannel: this.client.localise(
				"entry.verification.inquiry.channel",
				this.guildLocale,
			)({ user: entryRequestAuthor.username }),
		};

		const ticketService = this.client.getPromptService(this.guildId, { type: "tickets" });
		if (ticketService === undefined) {
			return;
		}

		const ticketDocument = await ticketService.openTicket({
			type: "standalone",
			formData: { topic: strings.inquiryChannel },
			user: entryRequestAuthor,
		});
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
					guild_name: this.guild.name,
				}),
			};

			await this.client.succeeded(interaction, {
				title: strings.title,
				description: strings.description,
			});
		}
	}

	#getVoteInformation(entryRequestDocument: EntryRequest): VoteInformation | undefined {
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
			configuration: Guild["verification"] & { enabled: true },
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

		const acceptance = getVoteInformation("acceptance", configuration, entryRequestDocument.votersFor.length);
		const rejection = getVoteInformation("rejection", configuration, entryRequestDocument.votersAgainst.length);

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
