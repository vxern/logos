import constants from "../../../../constants/constants";
import { Locale, getLocalisationLanguageByLocale } from "../../../../constants/languages";
import { MentionTypes, TimestampFormat, mention, timestamp } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise, pluralise } from "../../../client";
import { stringifyValue } from "../../../database/database";
import { Document } from "../../../database/document";
import { EntryRequest } from "../../../database/structs/entry-request";
import { User } from "../../../database/structs/user";
import diagnostics from "../../../diagnostics";
import { acknowledge, encodeId, getFeatureLanguage, getLocaleData, reply } from "../../../interactions";
import { getGuildIconURLFormatted, snowflakeToTimestamp } from "../../../utils";
import { Configurations, PromptService } from "../service";
import * as Discord from "@discordeno/bot";

type Metadata = { userId: bigint; reference: string };
type InteractionData = [userId: string, guildId: string, reference: string, isAccept: string];

type Configuration = Configurations["verification"];
type VoteInformation = {
	[K in keyof NonNullable<Configuration["voting"]>["verdict"]]: {
		required: number;
		remaining: number;
	};
};

class VerificationService extends PromptService<"verification", EntryRequest, Metadata, InteractionData> {
	constructor([client, bot]: [Client, Discord.Bot], guildId: bigint) {
		super([client, bot], guildId, { type: "verification" });
	}

	getAllDocuments(): Document<EntryRequest>[] {
		const entryRequests: Document<EntryRequest>[] = [];

		for (const [compositeId, entryRequest] of this.client.database.cache.entryRequestBySubmitterAndGuild.entries()) {
			const [_, guildIdString] = compositeId.split(constants.symbols.meta.idSeparator);
			if (guildIdString === undefined) {
				continue;
			}

			if (guildIdString !== this.guildIdString) {
				continue;
			}

			if (entryRequest.data.isFinalised) {
				continue;
			}

			entryRequests.push(entryRequest);
		}

		return entryRequests;
	}

	getUserDocument(document: Document<EntryRequest>): Promise<Document<User> | undefined> {
		return this.client.database.adapters.users.getOrFetch(this.client, "reference", document.data.submitter);
	}

	decodeMetadata(data: string[]): Metadata | undefined {
		const [userId, reference] = data;
		if (userId === undefined || reference === undefined) {
			return undefined;
		}

		return { userId: BigInt(userId), reference };
	}

	getPromptContent(user: Logos.User, document: Document<EntryRequest>): Discord.CreateMessageOptions | undefined {
		const [guild, guildDocument] = [this.guild, this.guildDocument];
		if (guild === undefined || guildDocument === undefined) {
			return undefined;
		}

		const reference = stringifyValue(document.ref);

		const voteInformation = this.getVoteInformation(document.data);
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
							value: document.data.answers.reason,
						},
						{
							name: `2. ${strings.verification.aim}`,
							value: document.data.answers.aim,
						},
						{
							name: `3. ${strings.verification.whereFound}`,
							value: document.data.answers.whereFound,
						},
					],
				},
				{
					title: diagnostics.display.user(user),
					color: constants.colors.turquoise,
					fields: [
						{
							name: strings.requestedRoles,
							value: mention(BigInt(document.data.requestedRole), MentionTypes.Role),
							inline: true,
						},
						{
							name: strings.accountCreated,
							value: `${accountCreatedLongDateTimestamp} (${accountCreatedRelativeTimestamp})`,
							inline: true,
						},
						{
							name: strings.answersSubmitted,
							value: timestamp(document.data.createdAt, TimestampFormat.Relative),
							inline: true,
						},
					],
					footer: {
						text: guild.name,
						iconUrl: `${getGuildIconURLFormatted(
							guild,
						)}&metadata=${`${user.id}${constants.symbols.meta.metadataSeparator}${reference}`}`,
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
								user.id.toString(),
								this.guildIdString,
								reference,
								`${true}`,
							]),
						},
						{
							type: Discord.MessageComponentTypes.Button,
							style: Discord.ButtonStyles.Danger,
							label: voteInformation.rejection.required === 1 ? strings.reject : strings.rejectMultiple,
							customId: encodeId<InteractionData>(constants.components.verification, [
								user.id.toString(),
								this.guildIdString,
								reference,
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
	): Promise<Document<EntryRequest> | null | undefined> {
		const localeData = await getLocaleData(this.client, interaction);
		const locale = localeData.locale;

		const configuration = this.configuration;
		if (configuration === undefined || !configuration.enabled) {
			return undefined;
		}

		const [userId, _, __, isAcceptString] = data;
		const isAccept = isAcceptString === "true";

		const user = await this.client.database.adapters.users.getOrFetchOrCreate(
			this.client,
			"id",
			userId,
			BigInt(userId),
		);
		if (user === undefined) {
			this.displayUserStateError(interaction, { locale });
			return undefined;
		}

		const member = interaction.member;
		if (member === undefined) {
			return undefined;
		}

		const guildId = interaction.guildId;
		if (guildId === undefined) {
			return undefined;
		}

		const guild = this.client.cache.guilds.get(guildId);
		if (guild === undefined) {
			this.displayVoteError(interaction, { locale });
			return undefined;
		}

		const [voter, entryRequest] = await Promise.all([
			this.client.database.adapters.users.getOrFetchOrCreate(
				this.client,
				"id",
				interaction.user.id.toString(),
				interaction.user.id,
			),
			this.client.database.adapters.entryRequests.get(this.client, "submitterAndGuild", [
				user.ref,
				this.guildIdString,
			]) as Document<EntryRequest> | undefined,
		]);
		if (voter === undefined || entryRequest === undefined) {
			this.displayVoteError(interaction, { locale });
			return undefined;
		}

		const voterReferenceId = stringifyValue(voter.ref);

		const [alreadyVotedToAccept, alreadyVotedToReject] = [
			entryRequest.data.votedFor,
			entryRequest.data.votedAgainst,
		].map((voters) => voters.some((voterReference) => stringifyValue(voterReference) === voterReferenceId)) as [
			boolean,
			boolean,
		];

		const voteInformation = this.getVoteInformation(entryRequest.data);
		if (voteInformation === undefined) {
			return undefined;
		}

		const [votedFor, votedAgainst] = [[...entryRequest.data.votedFor], [...entryRequest.data.votedAgainst]];

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
					const voterIndex = votedAgainst.findIndex(
						(voterReference) => stringifyValue(voterReference) === voterReferenceId,
					);

					votedAgainst.splice(voterIndex, 1);
					votedFor.push(voter.ref);
				} else {
					const voterIndex = votedFor.findIndex(
						(voterReference) => stringifyValue(voterReference) === voterReferenceId,
					);

					votedFor.splice(voterIndex, 1);
					votedAgainst.push(voter.ref);
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
				votedFor.push(voter.ref);
			} else {
				votedAgainst.push(voter.ref);
			}
		}

		const [isAccepted, isRejected] = [
			votedFor.length >= voteInformation.acceptance.required,
			votedAgainst.length >= voteInformation.rejection.required,
		];

		const submitter = this.client.cache.users.get(BigInt(user.data.account.id));
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

		const updatedEntryRequest = await this.client.database.adapters.entryRequests.update(this.client, {
			...entryRequest,
			data: { ...entryRequest.data, votedAgainst, votedFor, isFinalised },
		});
		if (updatedEntryRequest === undefined) {
			return undefined;
		}

		let authorisedOn = user.data.account.authorisedOn !== undefined ? [...user.data.account.authorisedOn] : undefined;
		let rejectedOn = user.data.account.rejectedOn !== undefined ? [...user.data.account.rejectedOn] : undefined;

		if (isAccepted) {
			if (authorisedOn === undefined) {
				authorisedOn = [this.guildIdString];
			} else if (!authorisedOn.includes(this.guildIdString)) {
				authorisedOn.push(this.guildIdString);
			}

			this.client.log.info(
				`Accepted ${diagnostics.display.user(user.data.account.id)} onto ${diagnostics.display.guild(guild)}.`,
			);

			this.bot.rest
				.addRole(this.guildId, submitter.id, BigInt(entryRequest.data.requestedRole), "User-requested role addition.")
				.catch(() =>
					this.client.log.warn(
						`Failed to add ${diagnostics.display.role(entryRequest.data.requestedRole)} to ${diagnostics.display.user(
							user.data.account.id,
						)} on ${diagnostics.display.guild(guild)}.`,
					),
				);
		} else if (isRejected) {
			if (rejectedOn === undefined) {
				rejectedOn = [this.guildIdString];
			} else if (!rejectedOn.includes(this.guildIdString)) {
				rejectedOn.push(this.guildIdString);
			}

			this.client.log.info(
				`Rejected ${diagnostics.display.user(user.data.account.id)} from ${diagnostics.display.guild(guild)}.`,
			);

			this.bot.rest
				.banMember(this.guildId, submitter.id, {}, "Voted to reject entry request.")
				.catch(() =>
					this.client.log.warn(
						`Failed to ban ${diagnostics.display.user(user.data.account.id)} on ${diagnostics.display.guild(guild)}.`,
					),
				);
		}

		await this.client.database.adapters.users.update(this.client, {
			...user,
			data: { ...user.data, account: { ...user.data.account, authorisedOn, rejectedOn } },
		});

		if (isAccepted || isRejected) {
			return null;
		}

		return updatedEntryRequest;
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

		const acceptance = getVoteInformation("acceptance", configuration, entryRequest.votedFor.length);
		const rejection = getVoteInformation("rejection", configuration, entryRequest.votedAgainst.length);

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

	private async displayUserStateError(interaction: Discord.Interaction, { locale }: { locale: Locale }): Promise<void> {
		const strings = {
			title: localise(this.client, "entry.verification.vote.stateUpdateFailed.title", locale)(),
			description: localise(this.client, "entry.verification.vote.stateUpdateFailed.description", locale)(),
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
