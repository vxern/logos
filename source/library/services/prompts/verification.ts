import { mention, timestamp } from "logos:core/formatting";
import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import type { EntryRequest, VoteType } from "logos/models/entry-request";
import type { Guild } from "logos/models/guild";
import { Model } from "logos/models/model";
import { User } from "logos/models/user";
import { PromptService } from "logos/services/prompts/service";

type Configuration = NonNullable<Guild["verification"]>;
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
	readonly #openInquiry: InteractionCollector<[partialId: string]>;

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(
			client,
			{ identifier: "VerificationPromptService", guildId },
			{ type: "verification", deleteMode: "none" },
		);

		this.#openInquiry = new InteractionCollector(client, {
			guildId,
			customId: InteractionCollector.encodeCustomId([constants.components.createInquiry]),
			isPermanent: true,
		});
	}

	async start(): Promise<void> {
		this.#openInquiry.onInteraction(async (selection) => {
			await this.#handleOpenInquiry(selection, selection.metadata[1]);
		});

		await this.client.registerInteractionCollector(this.#openInquiry);

		await super.start();
	}

	async stop(): Promise<void> {
		this.#openInquiry.close();

		await super.stop();
	}

	getAllDocuments(): Map<string, EntryRequest> {
		const member = this.client.entities.members.get(this.guildId)?.get(this.client.bot.id);
		if (member === undefined) {
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
			if (verdict !== undefined) {
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

		const accountCreatedRelativeTimestamp = timestamp(Discord.snowflakeToTimestamp(user.id), {
			format: "relative",
		});
		const accountCreatedLongDateTimestamp = timestamp(Discord.snowflakeToTimestamp(user.id), {
			format: "long-date",
		});

		const votedForFormatted = entryRequestDocument.votersFor.map((userId) => mention(userId, { type: "user" }));
		const votedAgainstFormatted = entryRequestDocument.votersAgainst.map((userId) =>
			mention(userId, { type: "user" }),
		);

		const strings = constants.contexts.entryRequestPrompt({
			localise: this.client.localise.bind(this.client),
			locale: this.guildLocale,
		});
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
							name: this.client.diagnostics.user(user),
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
								votedForFormatted !== undefined && votedForFormatted.length > 0
									? votedForFormatted.join("\n")
									: `*${strings.noneYet}*`,
							inline: true,
						},
						{
							name: `${constants.emojis.verification.against} ${strings.votesAgainst}`,
							value:
								votedAgainstFormatted !== undefined && votedAgainstFormatted.length > 0
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
							label:
								voteInformation.acceptance.remaining === 1
									? strings.accept
									: strings.acceptMultiple({
											votes: this.client.pluralise(
												"entry.verification.vote.acceptMultiple.votes",
												this.guildLocale,
												{
													quantity: voteInformation.acceptance.remaining,
												},
											),
										}),
							customId: this.magicButton.encodeId([entryRequestDocument.partialId, `${true}`]),
						},
						{
							type: Discord.MessageComponentTypes.Button,
							style: Discord.ButtonStyles.Danger,
							label:
								voteInformation.rejection.remaining === 1
									? strings.reject
									: strings.rejectMultiple({
											votes: this.client.pluralise(
												"entry.verification.vote.rejectMultiple.votes",
												this.guildLocale,
												{
													quantity: voteInformation.rejection.remaining,
												},
											),
										}),
							customId: this.magicButton.encodeId([entryRequestDocument.partialId, `${false}`]),
						},
						...((entryRequestDocument.ticketChannelId === undefined
							? [
									{
										type: Discord.MessageComponentTypes.Button,
										style: Discord.ButtonStyles.Primary,
										label: strings.open,
										customId: this.#openInquiry.encodeId([entryRequestDocument.partialId]),
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
		const [guildId, authorId] = Model.getDataFromPartialId<EntryRequest>(interaction.metadata[1]);
		if (guildId === undefined || authorId === undefined) {
			return undefined;
		}

		const newVote: VoteType = interaction.metadata[2] === "true" ? "for" : "against";

		const voter = interaction.member;
		if (voter === undefined) {
			return undefined;
		}

		const entryRequestDocument = this.client.documents.entryRequests.get(
			Model.buildPartialId<EntryRequest>({ guildId, authorId }),
		);
		if (entryRequestDocument === undefined) {
			await this.#displayVoteError(interaction);
			return undefined;
		}

		const currentVote = entryRequestDocument.getUserVote({ userId: interaction.user.id.toString() });

		const management = this.configuration.management;

		const roleIds = management?.roles?.map((roleId) => BigInt(roleId));
		const userIds = management?.users?.map((userId) => BigInt(userId));

		if (currentVote === "for" && newVote === "for") {
			const isAuthorised =
				voter.roles.some((roleId) => roleIds?.includes(roleId) ?? false) ||
				(userIds?.includes(interaction.user.id) ?? false);

			if (isAuthorised) {
				const { promise, resolve } = Promise.withResolvers<null | undefined>();

				const confirmButton = new InteractionCollector(this.client, {
					only: [interaction.user.id],
					isSingle: true,
				});
				const cancelButton = new InteractionCollector(this.client, {
					only: [interaction.user.id],
					isSingle: true,
				});

				confirmButton.onInteraction(async (_) => {
					await this.client.deleteReply(interaction);

					if (entryRequestDocument.isFinalised) {
						resolve(undefined);
						return;
					}

					await entryRequestDocument.update(this.client, () => {
						entryRequestDocument.forceVerdict({
							userId: interaction.user.id.toString(),
							verdict: "accepted",
						});
					});

					await this.#tryFinalise({ entryRequestDocument, voter });

					resolve(null);
				});

				cancelButton.onInteraction(async (_) => {
					await this.client.deleteReply(interaction);

					resolve(undefined);
				});

				confirmButton.onDone(() => resolve(undefined));
				cancelButton.onDone(() => resolve(undefined));

				await this.client.registerInteractionCollector(confirmButton);
				await this.client.registerInteractionCollector(cancelButton);

				const strings = constants.contexts.sureToForceAccept({
					localise: this.client.localise.bind(this.client),
					locale: interaction.locale,
				});
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

			const strings = constants.contexts.alreadyVotedInFavour({
				localise: this.client.localise.bind(this.client),
				locale: interaction.locale,
			});
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
				const { promise, resolve } = Promise.withResolvers<null | undefined>();

				const confirmButton = new InteractionCollector(this.client, {
					only: [interaction.user.id],
					isSingle: true,
				});
				const cancelButton = new InteractionCollector(this.client, {
					only: [interaction.user.id],
					isSingle: true,
				});

				confirmButton.onInteraction(async (_) => {
					await this.client.deleteReply(interaction);

					if (entryRequestDocument.isFinalised) {
						resolve(undefined);
						return;
					}

					await entryRequestDocument.update(this.client, () => {
						entryRequestDocument.forceVerdict({
							userId: interaction.user.id.toString(),
							verdict: "rejected",
						});
					});

					await this.#tryFinalise({ entryRequestDocument, voter });

					resolve(null);
				});

				cancelButton.onInteraction(async (_) => {
					await this.client.deleteReply(interaction);

					resolve(undefined);
				});

				confirmButton.onDone(() => resolve(undefined));
				cancelButton.onDone(() => resolve(undefined));

				await this.client.registerInteractionCollector(confirmButton);
				await this.client.registerInteractionCollector(cancelButton);

				const strings = constants.contexts.sureToForceReject({
					localise: this.client.localise.bind(this.client),
					locale: interaction.locale,
				});
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

			const strings = constants.contexts.alreadyVotedAgainst({
				localise: this.client.localise.bind(this.client),
				locale: interaction.locale,
			});
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
			const strings = constants.contexts.stanceChanged({
				localise: this.client.localise.bind(this.client),
				locale: interaction.locale,
			});
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
				`Accepted ${this.client.diagnostics.user(authorDocument.userId)} onto ${this.client.diagnostics.guild(
					guild,
				)}.`,
			);

			this.client.bot.helpers
				.addRole(
					this.guildId,
					author.id,
					BigInt(entryRequestDocument.requestedRoleId),
					"User-requested role addition.",
				)
				.catch(() =>
					this.log.warn(
						`Failed to add ${this.client.diagnostics.role(
							entryRequestDocument.requestedRoleId,
						)} to ${this.client.diagnostics.user(authorDocument.userId)} on ${this.client.diagnostics.guild(
							guild,
						)}.`,
					),
				);

			await this.client.tryLog("entryRequestAccept", { guildId: guild.id, args: [author, voter] });
		} else if (verdict === "rejected") {
			await authorDocument.update(this.client, () => {
				authorDocument.setAuthorisationStatus({ guildId: this.guildIdString, status: "rejected" });
			});

			this.log.info(
				`Rejected ${this.client.diagnostics.user(authorDocument.userId)} from ${this.client.diagnostics.guild(
					guild,
				)}.`,
			);

			this.client.bot.helpers
				.banMember(this.guildId, author.id, {}, "Voted to reject entry request.")
				.catch(() =>
					this.log.warn(
						`Failed to ban ${this.client.diagnostics.user(
							authorDocument.userId,
						)} on ${this.client.diagnostics.guild(guild)}.`,
					),
				);

			await this.client.tryLog("entryRequestReject", { guildId: guild.id, args: [author, voter] });
		}

		return true;
	}

	async #handleOpenInquiry(interaction: Logos.Interaction, partialId: string): Promise<void> {
		await this.client.postponeReply(interaction);

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

		const ticketService = this.client.getPromptService(this.guildId, { type: "tickets" });
		if (ticketService === undefined) {
			return;
		}

		const strings = constants.contexts.inquiryChannel({
			localise: this.client.localise.bind(this.client),
			locale: this.guildLocale,
		});
		const ticketDocument = await ticketService.openTicket({
			type: "inquiry",
			formData: { topic: strings.inquiryChannel({ user: entryRequestAuthor.username }) },
			user: entryRequestAuthor,
		});
		if (ticketDocument === undefined) {
			const strings = constants.contexts.inquiryFailed({
				localise: this.client.localise.bind(this.client),
				locale: interaction.locale,
			});
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

		await this.client.bot.helpers
			.deleteMessage(prompt.channelId, prompt.id)
			.catch(() => this.log.warn("Failed to delete prompt."));

		{
			const strings = constants.contexts.inquiryOpened({
				localise: this.client.localise.bind(this.client),
				locale: interaction.locale,
			});
			await this.client.succeeded(interaction, {
				title: strings.title,
				description: strings.description({ guild_name: this.guild.name }),
			});
		}
	}

	#getVoteInformation(entryRequestDocument: EntryRequest): VoteInformation | undefined {
		const roleIds = this.guild.roles
			.filter((role) => this.configuration.voting.roles.includes(role.id.toString()))
			.map((role) => role.id);
		const userIds = this.configuration.voting.users?.map((userId) => BigInt(userId));

		const voterCount = this.guild.members
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

		const acceptance = getVoteInformation("acceptance", this.configuration, entryRequestDocument.votersFor.length);
		const rejection = getVoteInformation(
			"rejection",
			this.configuration,
			entryRequestDocument.votersAgainst.length,
		);

		return { acceptance, rejection };
	}

	async #displayVoteError(interaction: Logos.Interaction): Promise<void> {
		const strings = constants.contexts.voteFailed({
			localise: this.client.localise.bind(this.client),
			locale: interaction.locale,
		});
		await this.client.failure(interaction, {
			title: strings.title,
			description: strings.description,
		});
	}
}

export { VerificationPromptService };
