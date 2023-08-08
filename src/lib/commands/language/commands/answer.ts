import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import { trim } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import diagnostics from "../../../diagnostics";
import { Modal, acknowledge, createModalComposer, reply } from "../../../interactions";
import { getMemberAvatarURL } from "../../../utils";
import { CommandTemplate } from "../../command";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "answer.options.answer",
	type: Discord.ApplicationCommandTypes.Message,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleStartAnswering,
};

interface AnswerData extends Record<string, unknown> {
	question: string;
	answer: string;
}

async function handleStartAnswering(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

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
			title: localise(client, "answer.strings.cannotAnswer.title", locale)(),
			description: localise(client, "answer.strings.cannotAnswer.description", locale)(),
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
			title: localise(client, "answer.strings.cannotAnswerOwn.title", locale)(),
			description: localise(client, "answer.strings.cannotAnswerOwn.description", locale)(),
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

	const data: AnswerData = {
		question: trim(message.content, 4000),
		answer: "",
	};

	createModalComposer([client, bot], interaction, {
		modal: generateAnswerModal(client, data, { locale }),
		onSubmit: async (submission, data) => {
			acknowledge([client, bot], submission);

			const strings = {
				answer: localise(client, "answer.strings.answer", locale)(),
				submittedBy: localise(
					client,
					"answer.strings.submittedBy",
					locale,
				)({ username: diagnostics.display.user(interaction.user, { includeId: false }) }),
			};

			Discord.sendMessage(bot, message.channelId, {
				messageReference: { messageId: message.id, channelId: message.channelId, guildId, failIfNotExists: false },
				embeds: [
					{
						description: `– *${data.answer}*`,
						color: constants.colors.lightGreen,
						footer: {
							text: `${constants.symbols.answer} ${strings.submittedBy}`,
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
			}).catch(() => client.log.warn(`Failed to send answer to ${diagnostics.display.channel(message.channelId)}.`));

			return true;
		},
		onInvalid: async (_, __) => undefined,
	});
}

function generateAnswerModal(client: Client, data: AnswerData, { locale }: { locale: Locale }): Modal<AnswerData> {
	const strings = {
		title: localise(client, "answer.title", locale)(),
		question: localise(client, "answer.fields.question", locale)(),
		answer: localise(client, "answer.fields.answer", locale)(),
	};

	return {
		title: strings.title,
		fields: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "question",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.question, 45),
						value: data.question,
						style: Discord.TextStyles.Paragraph,
						required: false,
					},
				],
			},
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						customId: "answer",
						type: Discord.MessageComponentTypes.InputText,
						label: trim(strings.answer, 45),
						value: data.answer,
						style: Discord.TextStyles.Paragraph,
						required: true,
					},
				],
			},
		],
	};
}

export default command;
