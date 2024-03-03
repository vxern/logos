import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import diagnostics from "../../../../diagnostics";
import { trim } from "../../../../formatting";
import { Client, InteractionCollector } from "../../../client";
import { Modal, createModalComposer } from "../../../interactions";
import { CommandTemplate } from "../../command";
import categories from "../../social/roles/roles";
import { isImplicit, isSingle } from "../../social/roles/types";

const commands = {
	partial: {
		id: "correction.options.partial.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: (...args) => handleStartCorrecting(...args, "partial"),
	},
	full: {
		id: "correction.options.full.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: (...args) => handleStartCorrecting(...args, "full"),
	},
} satisfies Record<string, CommandTemplate>;

interface CorrectionData extends Record<string, string> {
	original: string;
	corrected: string;
}

type OpenMode = "partial" | "full";

async function handleStartCorrecting(
	client: Client,
	interaction: Logos.Interaction,
	openMode: OpenMode,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const member = client.entities.members.get(Discord.snowflakeToBigint(`${interaction.user.id}${guildId}`));
	if (member === undefined) {
		return;
	}

	const message = interaction.data?.resolved?.messages?.array()?.at(0);
	if (message === undefined) {
		return;
	}

	if (message.author.toggles?.has("bot") || message.content.trim().length === 0) {
		const strings = {
			title: client.localise("correction.strings.cannotCorrect.title", locale)(),
			description: client.localise("correction.strings.cannotCorrect.description", locale)(),
		};

		client.reply(interaction, {
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

	if (message.author.id === interaction.user.id) {
		const strings = {
			title: client.localise("correction.strings.cannotCorrectOwn.title", locale)(),
			description: client.localise("correction.strings.cannotCorrectOwn.description", locale)(),
		};

		client.reply(interaction, {
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

	const correctedMember = client.entities.members.get(Discord.snowflakeToBigint(`${message.author.id}${guildId}`));
	if (correctedMember === undefined) {
		return;
	}

	const learningRoleCategory = categories.find((category) => category.id === "roles.learning");
	if (
		learningRoleCategory !== undefined &&
		isSingle(learningRoleCategory) &&
		isImplicit(learningRoleCategory.collection)
	) {
		const doNotCorrectMeRoleId = learningRoleCategory.collection.list.find(
			(role) => role.id === "roles.learning.roles.doNotCorrectMe",
		)?.snowflakes[guildId.toString()];
		if (doNotCorrectMeRoleId !== undefined) {
			if (correctedMember.roles.some((roleId) => roleId.toString() === doNotCorrectMeRoleId)) {
				const strings = {
					title: client.localise("correction.strings.userDoesNotWantCorrections.title", locale)(),
					description: client.localise("correction.strings.userDoesNotWantCorrections.description", locale)(),
				};

				client.reply(interaction, {
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
		}
	}

	if (message.content.length > constants.MAXIMUM_CORRECTION_MESSAGE_LENGTH) {
		const strings = {
			title: client.localise("correction.strings.tooLong.title", locale)(),
			description: {
				tooLong: client.localise("correction.strings.tooLong.description.tooLong", locale)(),
				maximumLength: client.localise(
					"correction.strings.tooLong.description.maximumLength",
					locale,
				)({ character_limit: constants.MAXIMUM_CORRECTION_MESSAGE_LENGTH }),
			},
		};

		client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.tooLong} ${strings.description.maximumLength}`,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	const data: CorrectionData = {
		original: message.content,
		corrected: "",
	};

	createModalComposer(client, interaction, {
		modal: generateCorrectionModal(client, data, openMode, { locale }),
		onSubmit: async (submission, data) => {
			if (data.corrected === data.original) {
				return "texts_not_different";
			}

			const strings = {
				correction: client.localise("correction.strings.correction", locale)(),
				suggestedBy: client.localise(
					"correction.strings.suggestedBy",
					locale,
				)({ username: diagnostics.display.user(interaction.user, { includeId: false }) }),
			};

			client.acknowledge(submission);

			client.bot.rest
				.sendMessage(message.channelId, {
					messageReference: { messageId: message.id, channelId: message.channelId, guildId, failIfNotExists: false },
					embeds: [
						{
							description: data.corrected,
							color: constants.colors.lightGreen,
							footer: {
								text: `${constants.symbols.correction} ${strings.suggestedBy}`,
								iconUrl: Discord.avatarUrl(interaction.user.id, interaction.user.discriminator, {
									avatar: interaction.user.avatar,
								}),
							},
						},
					],
				})
				.catch(() =>
					client.log.warn(`Failed to send correction to ${diagnostics.display.channel(message.channelId)}.`),
				);

			return true;
		},
		onInvalid: async (submission, error) => handleSubmittedInvalidCorrection(client, submission, error, { locale }),
	});
}

function generateCorrectionModal(
	client: Client,
	data: CorrectionData,
	openMode: OpenMode,
	{ locale }: { locale: Locale },
): Modal<CorrectionData> {
	const strings = {
		title: client.localise("correction.title", locale)(),
		original: client.localise("correction.fields.original", locale)(),
		corrected: client.localise("correction.fields.corrected", locale)(),
	};

	return {
		title: strings.title,
		fields: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "original",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.original, 45),
						value: data.original,
						style: Discord.TextStyles.Paragraph,
						required: false,
					},
				],
			},
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "corrected",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.corrected, 45),
						value: openMode === "full" ? data.original : undefined,
						style: Discord.TextStyles.Paragraph,
						required: true,
					},
				],
			},
		],
	};
}

async function handleSubmittedInvalidCorrection(
	client: Client,
	submission: Logos.Interaction,
	error: string | undefined,
	{ locale }: { locale: Locale },
): Promise<Logos.Interaction | undefined> {
	const { promise, resolve } = Promise.withResolvers<Logos.Interaction | undefined>();

	const continueButton = new InteractionCollector(client, { only: [submission.user.id], isSingle: true });
	const cancelButton = new InteractionCollector(client, { only: [submission.user.id] });
	const returnButton = new InteractionCollector(client, {
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});
	const leaveButton = new InteractionCollector(client, {
		only: [submission.user.id],
		isSingle: true,
		dependsOn: cancelButton,
	});

	continueButton.onCollect(async (buttonPress) => {
		client.deleteReply(submission);
		resolve(buttonPress);
	});

	cancelButton.onCollect(async (cancelButtonPress) => {
		returnButton.onCollect(async (returnButtonPress) => {
			client.deleteReply(submission);
			client.deleteReply(cancelButtonPress);
			resolve(returnButtonPress);
		});

		leaveButton.onCollect(async (_) => {
			client.deleteReply(submission);
			client.deleteReply(cancelButtonPress);
			resolve(undefined);
		});

		const strings = {
			title: client.localise("correction.strings.sureToCancel.title", locale)(),
			description: client.localise("correction.strings.sureToCancel.description", locale)(),
			stay: client.localise("prompts.stay", locale)(),
			leave: client.localise("prompts.leave", locale)(),
		};

		client.reply(cancelButtonPress, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: returnButton.customId,
							label: strings.stay,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: leaveButton.customId,
							label: strings.leave,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});
	});

	client.registerInteractionCollector(continueButton);
	client.registerInteractionCollector(cancelButton);
	client.registerInteractionCollector(returnButton);
	client.registerInteractionCollector(leaveButton);

	let embed!: Discord.CamelizedDiscordEmbed;
	switch (error) {
		case "texts_not_different": {
			const strings = {
				title: client.localise("correction.strings.textsNotDifferent.title", locale)(),
				description: client.localise("correction.strings.textsNotDifferent.description", locale)(),
			};

			embed = {
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			};

			break;
		}
		default: {
			const strings = {
				title: client.localise("correction.strings.failed.title", locale)(),
				description: client.localise("correction.strings.failed.description", locale)(),
			};

			client.reply(submission, {
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
	}

	const strings = {
		continue: client.localise("prompts.continue", locale)(),
		cancel: client.localise("prompts.cancel", locale)(),
	};

	client.reply(submission, {
		embeds: [embed],
		components: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						type: Discord.MessageComponentTypes.Button,
						customId: continueButton.customId,
						label: strings.continue,
						style: Discord.ButtonStyles.Success,
					},
					{
						type: Discord.MessageComponentTypes.Button,
						customId: cancelButton.customId,
						label: strings.cancel,
						style: Discord.ButtonStyles.Danger,
					},
				],
			},
		],
	});

	return promise;
}

export default commands;
