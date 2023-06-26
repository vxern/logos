import { Bot, Guild, Interaction, MessageComponentTypes, TextStyles } from 'discordeno';
import { logEvent } from 'logos/src/lib/controllers/logging/logging.ts';
import { stringifyValue } from 'logos/src/lib/database/database.ts';
import verificationManager from 'logos/src/lib/services/prompts/managers/verification.ts';
import { Client, localise, WithLanguage } from 'logos/src/lib/client.ts';
import { createModalComposer, editReply, Modal, postponeReply, reply } from 'logos/src/lib/interactions.ts';
import { getTextChannel } from 'logos/src/lib/utils.ts';
import configuration from 'logos/src/configuration.ts';
import constants from 'logos/src/constants.ts';
import { trim } from 'logos/src/formatting.ts';

function handleRequestVerification(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	parameter: string,
): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const requestedRoleId = BigInt(parameter);

	return void initiateVerificationProcess([client, bot], interaction, guild, requestedRoleId);
}

enum VerificationError {
	Failure = 'failure',
}

async function initiateVerificationProcess(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	guild: WithLanguage<Guild>,
	requestedRoleId: bigint,
): Promise<void> {
	const userDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'id',
		interaction.user.id.toString(),
		interaction.user.id,
	);
	if (userDocument === undefined) return;

	const entryRequest = client.database.adapters.entryRequests.get(
		client,
		'submitterAndGuild',
		[userDocument.ref, guild.id.toString()],
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

		return;
	}

	return void createModalComposer([client, bot], interaction, {
		modal: generateVerificationQuestionModal(client, guild, interaction.locale),
		onSubmit: async (submission, answers) => {
			const submitterReferenceId = stringifyValue(userDocument.ref);

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
					submitter: userDocument.ref,
					guild: guild.id.toString(),
					answers,
					votedFor: [],
					votedAgainst: [],
					requestedRole: requestedRoleId.toString(),
					isFinalised: false,
				},
			);
			if (entryRequest === undefined) return VerificationError.Failure;

			const channel = getTextChannel(guild, configuration.guilds.channels.verification);
			if (channel === undefined) return true;

			logEvent([client, bot], guild, 'entryRequestSubmit', [interaction.user, entryRequest.data]);

			const userId = BigInt(userDocument.data.account.id);
			const reference = stringifyValue(entryRequest.ref);

			const user = client.cache.users.get(userId);
			if (user === undefined) return VerificationError.Failure;

			const prompt = await verificationManager.savePrompt([client, bot], guild, channel, user, entryRequest);
			if (prompt === undefined) return VerificationError.Failure;

			verificationManager.registerPrompt(prompt, userId, reference, entryRequest);
			verificationManager.registerHandler(client, [userId.toString(), guild.id.toString(), reference]);

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

export { handleRequestVerification };
