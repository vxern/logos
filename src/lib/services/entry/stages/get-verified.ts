import configuration from "../../../../configuration.js";
import constants from "../../../../constants.js";
import { trim } from "../../../../formatting.js";
import { Client, WithLanguage, localise } from "../../../client.js";
import { stringifyValue } from "../../../database/database.js";
import { EntryRequest } from "../../../database/structs/entry-request.js";
import { Modal, createModalComposer, editReply, postponeReply, reply } from "../../../interactions.js";
import { logEvent } from "../../../services/logging/logging.js";
import verificationManager from "../../../services/prompts/managers/verification.js";
import { getTextChannel } from "../../../utils.js";
import * as Discord from "discordeno";

async function handleRequestVerification(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	parameter: string,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const requestedRoleId = BigInt(parameter);

	initiateVerificationProcess([client, bot], interaction, guild, requestedRoleId);
}

async function initiateVerificationProcess(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	guild: WithLanguage<Discord.Guild>,
	requestedRoleId: bigint,
): Promise<void> {
	const userDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		"id",
		interaction.user.id.toString(),
		interaction.user.id,
	);
	if (userDocument === undefined) {
		return;
	}

	const entryRequest = client.database.adapters.entryRequests.get(client, "submitterAndGuild", [
		userDocument.ref,
		guild.id.toString(),
	]);
	if (entryRequest !== undefined) {
		const strings = {
			title: localise(client, "entry.verification.answers.alreadyAnswered.title", interaction.locale)(),
			description: localise(client, "entry.verification.answers.alreadyAnswered.description", interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});

		return;
	}

	createModalComposer<EntryRequest["answers"]>([client, bot], interaction, {
		modal: generateVerificationQuestionModal(client, guild, interaction.locale),
		onSubmit: async (submission, answers) => {
			const submitterReferenceId = stringifyValue(userDocument.ref);

			if (client.database.cache.entryRequestBySubmitterAndGuild.has(`${submitterReferenceId}${guild.id}`)) {
				const strings = {
					title: localise(client, "entry.verification.answers.alreadyAnswered.title", interaction.locale)(),
					description: localise(client, "entry.verification.answers.alreadyAnswered.description", interaction.locale)(),
				};

				reply([client, bot], submission, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.darkRed,
						},
					],
				});

				return true;
			}

			await postponeReply([client, bot], submission);

			const entryRequest = await client.database.adapters.entryRequests.create(client, {
				createdAt: Date.now(),
				submitter: userDocument.ref,
				guild: guild.id.toString(),
				answers,
				votedFor: [],
				votedAgainst: [],
				requestedRole: requestedRoleId.toString(),
				isFinalised: false,
			});
			if (entryRequest === undefined) {
				return "failure";
			}

			const channel = getTextChannel(guild, configuration.guilds.channels.verification);
			if (channel === undefined) {
				return true;
			}

			logEvent([client, bot], guild, "entryRequestSubmit", [interaction.user, entryRequest.data]);

			const userId = BigInt(userDocument.data.account.id);
			const reference = stringifyValue(entryRequest.ref);

			const user = client.cache.users.get(userId);
			if (user === undefined) {
				return "failure";
			}

			const prompt = await verificationManager.savePrompt([client, bot], guild, channel, user, entryRequest);
			if (prompt === undefined) {
				return "failure";
			}

			verificationManager.registerPrompt(prompt, userId, reference, entryRequest);
			verificationManager.registerHandler(client, [userId.toString(), guild.id.toString(), reference]);

			const strings = {
				title: localise(client, "entry.verification.answers.submitted.title", interaction.locale)(),
				description: {
					submitted: localise(
						client,
						"entry.verification.answers.submitted.description.submitted",
						interaction.locale,
					)(),
					willBeReviewed: localise(
						client,
						"entry.verification.answers.submitted.description.willBeReviewed",
						interaction.locale,
					)(),
				},
			};

			editReply([client, bot], submission, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.submitted}\n\n${strings.description.willBeReviewed}`,
						color: constants.colors.lightGreen,
					},
				],
			});

			return true;
		},
		onInvalid: async (submission, error) => {
			switch (error) {
				default: {
					const strings = {
						title: localise(client, "entry.verification.answers.failed.title", interaction.locale)(),
						description: localise(client, "entry.verification.answers.failed.description", interaction.locale)(),
					};

					editReply([client, bot], submission, {
						embeds: [
							{
								title: strings.title,
								description: strings.description,
								color: constants.colors.red,
							},
						],
					});

					return undefined;
				}
			}
		},
	});
}

function generateVerificationQuestionModal(
	client: Client,
	guild: WithLanguage<Discord.Guild>,
	locale: string | undefined,
): Modal<EntryRequest["answers"]> {
	const strings = {
		title: localise(client, "verification.title", locale)(),
		reason: localise(client, "verification.fields.reason", locale)({ language: guild.language }),
		aim: localise(client, "verification.fields.aim", locale)(),
		whereFound: localise(client, "verification.fields.whereFound", locale)(),
	};

	return {
		title: strings.title,
		fields: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "reason",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.reason, 45),
						style: Discord.TextStyles.Paragraph,
						required: true,
						minLength: 20,
						maxLength: 300,
					},
				],
			},
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "aim",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.aim, 45),
						style: Discord.TextStyles.Paragraph,
						required: true,
						minLength: 20,
						maxLength: 300,
					},
				],
			},
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "whereFound",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.whereFound, 45),
						style: Discord.TextStyles.Short,
						required: true,
						minLength: 5,
						maxLength: 50,
					},
				],
			},
		],
	};
}

export { handleRequestVerification };
