import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import { trim } from "../../../../formatting";
import { Client } from "../../../client";
import diagnostics from "../../../diagnostics";
import { Modal, createModalComposer } from "../../../interactions";
import { CommandTemplate } from "../../command";

const command: CommandTemplate = {
	id: "answer.message",
	type: Discord.ApplicationCommandTypes.Message,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleStartAnswering,
};

interface AnswerData extends Record<string, string> {
	question: string;
	answer: string;
}

async function handleStartAnswering(client: Client, interaction: Logos.Interaction): Promise<void> {
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
			title: client.localise("answer.strings.cannotAnswer.title", locale)(),
			description: client.localise("answer.strings.cannotAnswer.description", locale)(),
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
			title: client.localise("answer.strings.cannotAnswerOwn.title", locale)(),
			description: client.localise("answer.strings.cannotAnswerOwn.description", locale)(),
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

	const data: AnswerData = {
		question: trim(message.content, 4000),
		answer: "",
	};

	createModalComposer(client, interaction, {
		modal: generateAnswerModal(client, data, { locale }),
		onSubmit: async (submission, data) => {
			client.acknowledge(submission);

			const strings = {
				answer: client.localise("answer.strings.answer", locale)(),
				submittedBy: client.localise(
					"answer.strings.submittedBy",
					locale,
				)({ username: diagnostics.display.user(interaction.user, { includeId: false }) }),
			};

			client.bot.rest
				.sendMessage(message.channelId, {
					messageReference: { messageId: message.id, channelId: message.channelId, guildId, failIfNotExists: false },
					embeds: [
						{
							description: `– *${data.answer}*`,
							color: constants.colors.lightGreen,
							footer: {
								text: `${constants.symbols.answer} ${strings.submittedBy}`,
								iconUrl: Discord.avatarUrl(interaction.user.id, interaction.user.discriminator, {
									avatar: interaction.user.avatar,
								}),
							},
						},
					],
				})
				.catch(() => client.log.warn(`Failed to send answer to ${diagnostics.display.channel(message.channelId)}.`));

			return true;
		},
		onInvalid: async (_, __) => undefined,
	});
}

function generateAnswerModal(client: Client, data: AnswerData, { locale }: { locale: Locale }): Modal<AnswerData> {
	const strings = {
		title: client.localise("answer.title", locale)(),
		question: client.localise("answer.fields.question", locale)(),
		answer: client.localise("answer.fields.answer", locale)(),
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
