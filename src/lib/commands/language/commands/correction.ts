import constants from "../../../../constants/constants";
import { trim } from "../../../../formatting";
import { Client, localise } from "../../../client";
import diagnostics from "../../../diagnostics";
import {
	Modal,
	acknowledge,
	createInteractionCollector,
	createModalComposer,
	deleteReply,
	reply,
} from "../../../interactions";
import { getMemberAvatarURL } from "../../../utils";
import { CommandTemplate } from "../../command";
import * as Discord from "discordeno";

const commands = {
	partial: {
		name: "correction.options.partial",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: (...args) => handleStartCorrecting(...args, "partial"),
	},
	full: {
		name: "correction.options.full",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: (...args) => handleStartCorrecting(...args, "full"),
	},
} satisfies Record<string, CommandTemplate>;

interface CorrectionData extends Record<string, unknown> {
	original: string;
	corrected: string;
}

type OpenMode = "partial" | "full";

async function handleStartCorrecting(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	openMode: OpenMode,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const member = client.cache.members.get(Discord.snowflakeToBigint(`${interaction.user.id}${guildId}`));
	if (member === undefined) {
		return;
	}

	const message = interaction.data?.resolved?.messages?.array()?.at(0);
	if (message === undefined) {
		return;
	}

	if (message.isFromBot || message.content.trim().length === 0) {
		const strings = {
			title: localise(client, "correction.strings.cannotCorrect.title", interaction.locale)(),
			description: localise(client, "correction.strings.cannotCorrect.description", interaction.locale)(),
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

	if (message.authorId === interaction.user.id) {
		const strings = {
			title: localise(client, "correction.strings.cannotCorrectOwn.title", interaction.locale)(),
			description: localise(client, "correction.strings.cannotCorrectOwn.description", interaction.locale)(),
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

	if (message.content.length > constants.MAXIMUM_CORRECTION_MESSAGE_LENGTH) {
		const strings = {
			title: localise(client, "correction.strings.tooLong.title", interaction.locale)(),
			description: {
				tooLong: localise(client, "correction.strings.tooLong.description.tooLong", interaction.locale)(),
				maximumLength: localise(
					client,
					"correction.strings.tooLong.description.maximumLength",
					interaction.locale,
				)({ character_limit: constants.MAXIMUM_CORRECTION_MESSAGE_LENGTH }),
			},
		};

		reply([client, bot], interaction, {
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

	createModalComposer([client, bot], interaction, {
		modal: generateCorrectionModal(client, data, openMode, interaction.locale),
		onSubmit: async (submission, data) => {
			if (data.corrected === data.original) {
				return "texts_not_different";
			}

			const strings = {
				correction: localise(client, "correction.strings.correction", interaction.locale)(),
				suggestedBy: localise(
					client,
					"correction.strings.suggestedBy",
					interaction.locale,
				)({ username: diagnostics.display.user(interaction.user, { includeId: false }) }),
			};

			acknowledge([client, bot], submission);

			Discord.sendMessage(bot, message.channelId, {
				messageReference: { messageId: message.id, channelId: message.channelId, guildId, failIfNotExists: false },
				embeds: [
					{
						color: constants.colors.lightGreen,
						fields: [
							{
								name: strings.correction,
								value: data.corrected,
							},
						],
						footer: {
							text: strings.suggestedBy,
							iconUrl: (() => {
								if (member.avatar !== undefined) {
									return getMemberAvatarURL(bot, guildId, interaction.user.id, member.avatar);
								}

								return Discord.getAvatarURL(bot, interaction.user.id, interaction.user.discriminator, {
									avatar: interaction.user.avatar,
								});
							})(),
						},
					},
				],
			}).catch(() =>
				client.log.warn(`Failed to send correction to ${diagnostics.display.channel(message.channelId)}.`),
			);

			return true;
		},
		onInvalid: async (submission, error) => handleSubmittedInvalidCorrection([client, bot], submission, error),
	});
}

function generateCorrectionModal(
	client: Client,
	data: CorrectionData,
	openMode: OpenMode,
	locale: string | undefined,
): Modal<CorrectionData> {
	const strings = {
		title: localise(client, "correction.title", locale)(),
		original: localise(client, "correction.fields.original", locale)(),
		corrected: localise(client, "correction.fields.corrected", locale)(),
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
	[client, bot]: [Client, Discord.Bot],
	submission: Discord.Interaction,
	error: string | undefined,
): Promise<Discord.Interaction | undefined> {
	return new Promise((resolve) => {
		const continueId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (_, selection) => {
				deleteReply([client, bot], submission);
				resolve(selection);
			},
		});

		const cancelId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (_, cancelSelection) => {
				const returnId = createInteractionCollector([client, bot], {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: (_, returnSelection) => {
						deleteReply([client, bot], submission);
						deleteReply([client, bot], cancelSelection);
						resolve(returnSelection);
					},
				});

				const leaveId = createInteractionCollector([client, bot], {
					type: Discord.InteractionTypes.MessageComponent,
					onCollect: async (_, _leaveSelection) => {
						deleteReply([client, bot], submission);
						deleteReply([client, bot], cancelSelection);
						resolve(undefined);
					},
				});

				const strings = {
					title: localise(client, "correction.strings.sureToCancel.title", cancelSelection.locale)(),
					description: localise(client, "correction.strings.sureToCancel.description", cancelSelection.locale)(),
					stay: localise(client, "prompts.stay", cancelSelection.locale)(),
					leave: localise(client, "prompts.leave", cancelSelection.locale)(),
				};

				reply([client, bot], cancelSelection, {
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
									customId: returnId,
									label: strings.stay,
									style: Discord.ButtonStyles.Success,
								},
								{
									type: Discord.MessageComponentTypes.Button,
									customId: leaveId,
									label: strings.leave,
									style: Discord.ButtonStyles.Danger,
								},
							],
						},
					],
				});
			},
		});

		let embed!: Discord.Embed;
		switch (error) {
			case "texts_not_different": {
				const strings = {
					title: localise(client, "correction.strings.textsNotDifferent.title", submission.locale)(),
					description: localise(client, "correction.strings.textsNotDifferent.description", submission.locale)(),
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
					title: localise(client, "correction.strings.failed.title", submission.locale)(),
					description: localise(client, "correction.strings.failed.description", submission.locale)(),
				};

				reply([client, bot], submission, {
					embeds: [
						{
							title: strings.title,
							description: strings.description,
							color: constants.colors.dullYellow,
						},
					],
				});
				break;
			}
		}

		const strings = {
			continue: localise(client, "prompts.continue", submission.locale)(),
			cancel: localise(client, "prompts.cancel", submission.locale)(),
		};

		reply([client, bot], submission, {
			embeds: [embed],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: continueId,
							label: strings.continue,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: cancelId,
							label: strings.cancel,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});
	});
}

export default commands;
