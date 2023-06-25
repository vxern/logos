import {
	addRole,
	banMember,
	Bot,
	ButtonStyles,
	CreateMessage,
	getAvatarURL,
	Guild,
	Interaction,
	MessageComponentTypes,
	User as DiscordUser,
} from 'discordeno';
import { EntryRequest, User } from 'logos/src/database/structs/mod.ts';
import { logEvent } from 'logos/src/controllers/logging/logging.ts';
import { Document } from 'logos/src/database/document.ts';
import { stringifyValue } from 'logos/src/database/database.ts';
import { getNecessaryVotes } from 'logos/src/services/prompts/managers/verification/votes.ts';
import { Client, localise, WithLanguage } from 'logos/src/client.ts';
import { acknowledge, encodeId, reply } from 'logos/src/interactions.ts';
import { diagnosticMentionUser } from 'logos/src/utils.ts';
import { defaultLocale } from 'logos/types.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { PromptManager } from 'logos/src/services/prompts/manager.ts';

type Metadata = { userId: bigint; reference: string };
type InteractionData = [userId: string, guildId: string, reference: string, isAccept: string];

class VerificationManager extends PromptManager<EntryRequest, Metadata, InteractionData> {
	getAllDocuments(client: Client): Map<bigint, Document<EntryRequest>[]> {
		const entryRequestsByGuildId = new Map<bigint, Document<EntryRequest>[]>();

		for (const entryRequest of client.database.cache.entryRequestBySubmitterAndGuild.values()) {
			const guildId = BigInt(entryRequest.data.guild);

			if (!entryRequestsByGuildId.has(guildId)) {
				entryRequestsByGuildId.set(guildId, [entryRequest]);
				continue;
			}

			entryRequestsByGuildId.get(guildId)!.push(entryRequest);
		}

		return entryRequestsByGuildId;
	}

	getUserDocument(client: Client, document: Document<EntryRequest>): Promise<Document<User> | undefined> {
		return client.database.adapters.users.getOrFetch(client, 'reference', document.data.submitter);
	}

	decodeMetadata(data: string[]): Metadata | undefined {
		const [userId, reference] = data;
		if (userId === undefined || reference === undefined) return undefined;

		return { userId: BigInt(userId), reference };
	}

	getPromptContent(
		[client, bot]: [Client, Bot],
		guild: WithLanguage<Guild>,
		user: DiscordUser,
		document: Document<EntryRequest>,
	): CreateMessage {
		const reference = stringifyValue(document.ref);

		const [
			[requiredAcceptanceVotes, requiredRejectionVotes],
			[votesToAccept, votesToReject],
		] = getNecessaryVotes(guild, document.data);

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
					value: document.data.answers.reason!,
				}, {
					name: strings.verification.aim,
					value: document.data.answers.aim!,
				}, {
					name: strings.verification.whereFound,
					value: document.data.answers.where_found!,
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
					customId: encodeId<InteractionData>(
						constants.staticComponentIds.verification,
						[user.id.toString(), guild.id.toString(), reference, `${true}`],
					),
				}, {
					type: MessageComponentTypes.Button,
					style: ButtonStyles.Danger,
					label: requiredRejectionVotes === 1 ? strings.reject : strings.rejectMultiple,
					customId: encodeId<InteractionData>(
						constants.staticComponentIds.verification,
						[user.id.toString(), guild.id.toString(), reference, `${false}`],
					),
				}],
			}],
		};
	}

	async handleInteraction(
		[client, bot]: [Client, Bot],
		interaction: Interaction,
		data: InteractionData,
	): Promise<Document<EntryRequest> | null | undefined> {
		const [userId, _, __, isAcceptString] = data;
		const isAccept = isAcceptString === 'true';

		const user = await client.database.adapters.users.getOrFetchOrCreate(client, 'id', userId, BigInt(userId));
		if (user === undefined) {
			displayUserStateError([client, bot], interaction);
			return undefined;
		}

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
				user.ref,
				guild.id.toString(),
			]) as Document<EntryRequest> | undefined,
		]);
		if (voter === undefined || entryRequest === undefined) {
			displayVoteError([client, bot], interaction);
			return undefined;
		}

		const voterReferenceId = stringifyValue(voter.ref);

		const alreadyVotedToAccept = entryRequest.data.votedFor.some((voterReference) =>
			stringifyValue(voterReference) === voterReferenceId
		);
		const alreadyVotedToReject = entryRequest.data.votedAgainst.some((voterReference) =>
			stringifyValue(voterReference) === voterReferenceId
		);

		const [[___, requiredRejectionVotes], [votesToAccept, votesToReject]] = getNecessaryVotes(
			guild,
			entryRequest.data,
		);

		const updatedEntryRequestContent = {
			...entryRequest,
			data: structuredClone(entryRequest.data) as EntryRequest,
		} as Document<EntryRequest>;

		// If the voter has already voted to accept or to reject the user.
		if (alreadyVotedToAccept || alreadyVotedToReject) {
			// If the voter has already voted to accept, and is voting to accept again.
			if (alreadyVotedToAccept && isAccept) {
				const strings = {
					title: localise(client, 'entry.verification.vote.alreadyVoted.inFavour.title', interaction.locale)(),
					description: localise(
						client,
						'entry.verification.vote.alreadyVoted.inFavour.description',
						interaction.locale,
					)(),
				};

				reply([client, bot], interaction, {
					embeds: [{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					}],
				});

				return;
				// If the voter has already voted to reject, and is voting to reject again.
			} else if (alreadyVotedToReject && !isAccept) {
				const strings = {
					title: localise(client, 'entry.verification.vote.alreadyVoted.against.title', interaction.locale)(),
					description: localise(
						client,
						'entry.verification.vote.alreadyVoted.against.description',
						interaction.locale,
					)(),
				};

				reply([client, bot], interaction, {
					embeds: [{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					}],
				});

				return;
			} else {
				if (isAccept) {
					const voterIndex = updatedEntryRequestContent.data.votedAgainst.findIndex((voterReference) =>
						stringifyValue(voterReference) === voterReferenceId
					);

					updatedEntryRequestContent.data.votedAgainst.splice(voterIndex, 1);
					updatedEntryRequestContent.data.votedFor.push(voter.ref);
				} else {
					const voterIndex = updatedEntryRequestContent.data.votedFor.findIndex((voterReference) =>
						stringifyValue(voterReference) === voterReferenceId
					);

					updatedEntryRequestContent.data.votedFor.splice(voterIndex, 1);
					updatedEntryRequestContent.data.votedAgainst.push(voter.ref);
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
				updatedEntryRequestContent.data.votedFor.push(voter.ref);
			} else {
				updatedEntryRequestContent.data.votedAgainst.push(voter.ref);
			}
		}

		const isAccepted = updatedEntryRequestContent.data.votedFor.length >= votesToAccept;
		const isRejected = updatedEntryRequestContent.data.votedAgainst.length >= votesToReject;

		const submitter = client.cache.users.get(BigInt(user.data.account.id))!;

		if (isAccepted || isRejected) {
			logEvent(
				[client, bot],
				guild,
				isAccepted ? 'entryRequestAccept' : 'entryRequestReject',
				[submitter, interaction.member!],
			);

			updatedEntryRequestContent.data.isFinalised = true;
		}

		const updatedEntryRequest = await client.database.adapters.entryRequests.update(
			client,
			updatedEntryRequestContent,
		);
		if (updatedEntryRequest === undefined) return undefined;

		const updatedUserContent = { ...user, data: structuredClone(user.data) as User } as Document<User>;

		if (isAccepted) {
			if (updatedUserContent.data.account.authorisedOn === undefined) {
				updatedUserContent.data.account.authorisedOn = [guild.id.toString()];
			} else if (!updatedUserContent.data.account.authorisedOn.includes(guild.id.toString())) {
				updatedUserContent.data.account.authorisedOn.push(guild.id.toString());
			}

			client.log.info(`User with ID ${user.data.account.id} has been accepted onto guild ${guild.name}.`);

			addRole(bot, guild.id, submitter.id, BigInt(entryRequest.data.requestedRole), 'User-requested role addition.')
				.catch(() =>
					client.log.warn(
						`Failed to add role with ID ${entryRequest.data.requestedRole} to submitter with ID ${user.data.account.id} in guild with ID ${guild.id}.`,
					)
				);
		} else if (isRejected) {
			if (updatedUserContent.data.account.rejectedOn === undefined) {
				updatedUserContent.data.account.rejectedOn = [guild.id.toString()];
			} else if (!updatedUserContent.data.account.rejectedOn.includes(guild.id.toString())) {
				updatedUserContent.data.account.rejectedOn.push(guild.id.toString());
			}

			client.log.info(`User with ID ${user.data.account.id} has been rejected from guild ${guild.name}.`);

			banMember(bot, guild.id, submitter.id, {
				reason: `${
					requiredRejectionVotes - votesToReject
				} guide(s) voted against this particular user being granted entry.`,
			}).catch(() =>
				client.log.warn(`Failed to ban member with ID ${user.data.account.id} on guild with ID ${guild.id}.`)
			);
		}

		await client.database.adapters.users.update(client, updatedUserContent);

		if (isAccepted || isRejected) return null;

		return updatedEntryRequest;
	}
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

const manager = new VerificationManager({
	customId: constants.staticComponentIds.verification,
	channelName: configuration.guilds.channels.verification,
	type: 'verification',
});

export default manager;
