import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale, getLocalisationLanguageByLocale } from "../../../../constants/languages";
import { MentionTypes, TimestampFormat, mention, timestamp } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise, pluralise } from "../../../client";
import { EntryRequest } from "../../../database/entry-request";
import { User } from "../../../database/user";
import diagnostics from "../../../diagnostics";
import { acknowledge, encodeId, getFeatureLanguage, getLocaleData, reply } from "../../../interactions";
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
	constructor([client, bot]: [Client, Discord.Bot], guildId: bigint) {
		super([client, bot], guildId, { type: "verification" });
	}

	getAllDocuments(): Map<string, EntryRequest> {
		const entryRequests: Map<string, EntryRequest> = new Map();

		for (const [compositeId, entryRequest] of this.client.cache.documents.entryRequests) {
			if (entryRequest.isFinalised) {
				continue;
			}

			entryRequests.set(compositeId, entryRequest);
		}

		return entryRequests;
	}

	async getUserDocument(entryRequestDocument: EntryRequest): Promise<User | undefined> {
		const session = this.client.database.openSession();

		const userDocument =
			this.client.cache.documents.users.get(entryRequestDocument.authorId) ??
			session.load<User>(`users/${entryRequestDocument.authorId}`).then((value) => value ?? undefined);

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

		const featureLanguage = getFeatureLanguage(guildDocument);

		const strings = {
			verification: {
				reason: localise(this.client, "verification.fields.reason", guildLocale)({ language: featureLanguage }),
				aim: localise(this.client, "verification.fields.aim", guildLocale)(),
				whereFound: localise(this.client, "verification.fields.whereFound", guildLocale)(),
			},
			answers: localise(this.client, "entry.verification.answers", guildLocale)(),
			requestedRoles: localise(this.client, "entry.verification.requestedRoles", guildLocale)(),
			accountCreated: localise(this.client, "entry.verification.accountCreated", guildLocale)(),
			answersSubmitted: localise(this.client, "entry.verification.answersSubmitted", guildLocale)(),
			accept: localise(this.client, "entry.verification.vote.accept", guildLocale)(),
			acceptMultiple: localise(
				this.client,
				"entry.verification.vote.acceptMultiple",
				guildLocale,
			)({
				votes: pluralise(
					this.client,
					"entry.verification.vote.acceptMultiple.votes",
					guildLanguage,
					voteInformation.acceptance.remaining,
				),
			}),
			reject: localise(this.client, "entry.verification.vote.reject", guildLocale)(),
			rejectMultiple: localise(
				this.client,
				"entry.verification.vote.rejectMultiple",
				guildLocale,
			)({
				votes: pluralise(
					this.client,
					"entry.verification.vote.rejectMultiple.votes",
					guildLanguage,
					voteInformation.rejection.remaining,
				),
			}),
		};

		const accountCreatedRelativeTimestamp = timestamp(snowflakeToTimestamp(user.id), TimestampFormat.Relative);
		const accountCreatedLongDateTimestamp = timestamp(snowflakeToTimestamp(user.id), TimestampFormat.LongDate);

		return {
			embeds: [
				{
					title: strings.answers,
					color: constants.colors.turquoise,
					thumbnail: (() => {
						const iconURL = Discord.avatarUrl(user.id, user.discriminator, {
							avatar: user.avatar,
							size: 64,
							format: "webp",
						});
						if (iconURL === undefined) {
							return;
						}

						return { url: iconURL };
					})(),
					fields: [
						{
							name: `1. ${strings.verification.reason}`,
							value: entryRequestDocument.answers.reason,
						},
						{
							name: `2. ${strings.verification.aim}`,
							value: entryRequestDocument.answers.aim,
						},
						{
							name: `3. ${strings.verification.whereFound}`,
							value: entryRequestDocument.answers.whereFound,
						},
					],
				},
				{
					title: diagnostics.display.user(user),
					color: constants.colors.turquoise,
					fields: [
						{
							name: strings.requestedRoles,
							value: mention(BigInt(entryRequestDocument.requestedRoleId), MentionTypes.Role),
							inline: true,
						},
						{
							name: strings.accountCreated,
							value: `${accountCreatedLongDateTimestamp} (${accountCreatedRelativeTimestamp})`,
							inline: true,
						},
						{
							name: strings.answersSubmitted,
							value: timestamp(entryRequestDocument.createdAt, TimestampFormat.Relative),
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
							label: voteInformation.acceptance.required === 1 ? strings.accept : strings.acceptMultiple,
							customId: encodeId<InteractionData>(constants.components.verification, [
								`${entryRequestDocument.guildId}/${entryRequestDocument.authorId}`,
								`${true}`,
							]),
						},
						{
							type: Discord.MessageComponentTypes.Button,
							style: Discord.ButtonStyles.Danger,
							label: voteInformation.rejection.required === 1 ? strings.reject : strings.rejectMultiple,
							customId: encodeId<InteractionData>(constants.components.verification, [
								`${entryRequestDocument.guildId}/${entryRequestDocument.authorId}`,
								`${false}`,
							]),
						},
					],
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

		const guild = this.client.cache.guilds.get(BigInt(guildId));
		if (guild === undefined) {
			this.displayVoteError(interaction, { locale });
			return undefined;
		}

		let session = this.client.database.openSession();

		const [authorDocument, voterDocument, entryRequestDocument] = await Promise.all([
			this.client.cache.documents.users.get(userId) ??
				(await session.load<User>(`users/${userId}`).then((value) => value ?? undefined)) ??
				(async () => {
					const userDocument = {
						...({
							id: `users/${userId}`,
							account: { id: userId },
							createdAt: Date.now(),
						} satisfies User),
						"@metadata": { "@collection": "Users" },
					};
					await session.store(userDocument);
					await session.saveChanges();

					return userDocument as User;
				})(),
			this.client.cache.documents.users.get(interaction.user.id.toString()) ??
				(await session.load<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
				(async () => {
					const userDocument = {
						...({
							id: `users/${interaction.user.id}`,
							account: { id: interaction.user.id.toString() },
							createdAt: Date.now(),
						} satisfies User),
						"@metadata": { "@collection": "Users" },
					};
					await session.store(userDocument);
					await session.saveChanges();

					return userDocument as User;
				})(),
			this.client.cache.documents.entryRequests.get(`${guildId}/${userId}`),
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

		// If the voter has already voted to accept or to reject the user.
		if (alreadyVotedToAccept || alreadyVotedToReject) {
			// If the voter has already voted to accept, and is voting to accept again.
			if (alreadyVotedToAccept && isAccept) {
				const strings = {
					title: localise(this.client, "entry.verification.vote.alreadyVoted.inFavour.title", locale)(),
					description: localise(this.client, "entry.verification.vote.alreadyVoted.inFavour.description", locale)(),
				};

				reply([this.client, this.bot], interaction, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.dullYellow,
						},
					],
				});

				return;
				// If the voter has already voted to reject, and is voting to reject again.
			} else if (alreadyVotedToReject && !isAccept) {
				const strings = {
					title: localise(this.client, "entry.verification.vote.alreadyVoted.against.title", locale)(),
					description: localise(this.client, "entry.verification.vote.alreadyVoted.against.description", locale)(),
				};

				reply([this.client, this.bot], interaction, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.dullYellow,
						},
					],
				});

				return;
			} else {
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
					title: localise(this.client, "entry.verification.vote.stanceChanged.title", locale)(),
					description: localise(this.client, "entry.verification.vote.stanceChanged.description", locale)(),
				};

				reply([this.client, this.bot], interaction, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.lightGreen,
						},
					],
				});
			}
		} else {
			acknowledge([this.client, this.bot], interaction);

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

		const submitter = this.client.cache.users.get(interaction.user.id);
		if (submitter === undefined) {
			return undefined;
		}

		let isFinalised = false;

		if (isAccepted || isRejected) {
			isFinalised = true;

			if (configuration.journaling) {
				const journallingService = this.client.services.journalling.get(this.guildId);

				if (isAccepted) {
					journallingService?.log("entryRequestAccept", { args: [submitter, member] });
				} else {
					journallingService?.log("entryRequestReject", { args: [submitter, member] });
				}
			}
		}

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

		session = this.client.database.openSession();

		entryRequestDocument.isFinalised = isFinalised;

		await session.store(entryRequestDocument);
		await session.saveChanges();

		session.dispose();

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

			this.bot.rest
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

			this.bot.rest
				.banMember(this.guildId, submitter.id, {}, "Voted to reject entry request.")
				.catch(() =>
					this.client.log.warn(
						`Failed to ban ${diagnostics.display.user(authorDocument.account.id)} on ${diagnostics.display.guild(
							guild,
						)}.`,
					),
				);
		}

		session = this.client.database.openSession();

		authorDocument.account.authorisedOn = authorisedOn;
		authorDocument.account.rejectedOn = rejectedOn;

		await session.store(authorDocument);
		await session.saveChanges();

		session.dispose();

		if (isAccepted || isRejected) {
			return null;
		}

		return entryRequestDocument;
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
					const remaining = required - votes;
					return { required, remaining };
				}
				case "number": {
					const required = Math.max(1, verdict.value);
					const remaining = required - votes;
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
			title: localise(this.client, "entry.verification.vote.failed.title", locale)(),
			description: localise(this.client, "entry.verification.vote.failed.description", locale)(),
		};

		reply([this.client, this.bot], interaction, {
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
