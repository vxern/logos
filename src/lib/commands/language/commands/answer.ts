import diagnostics from "../../../../diagnostics";
import { trim } from "../../../../formatting";
import { Client } from "../../../client";
import { Modal, ModalComposer } from "../../../components/modal-composer";

async function handleStartAnswering(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const member = client.entities.members.get(guildId)?.get(interaction.user.id);
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

		await client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
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

		await client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				},
			],
		});

		return;
	}

	const composer = new AnswerComposer(client, { interaction, question: message.content });

	composer.onSubmit(
		async (
			submission: Logos.Interaction,
			{ locale }: Logos.InteractionLocaleData,
			{ formData }: { formData: AnswerFormData },
		) => {
			await client.acknowledge(submission);

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
							description: `– *${formData.answer}*`,
							color: constants.colours.lightGreen,
							footer: {
								text: `${constants.emojis.answer} ${strings.submittedBy}`,
								iconUrl: Discord.avatarUrl(interaction.user.id, interaction.user.discriminator, {
									avatar: interaction.user.avatar,
								}),
							},
						},
					],
				})
				.catch(() => client.log.warn(`Failed to send answer to ${diagnostics.display.channel(message.channelId)}.`));
		},
	);

	await composer.open();
}

interface AnswerFormData {
	readonly question: string;
	readonly answer: string;
}
class AnswerComposer extends ModalComposer<AnswerFormData, never> {
	constructor(client: Client, { interaction, question }: { interaction: Logos.Interaction; question: string }) {
		super(client, { interaction, initialFormData: { question: trim(question, 4000), answer: "" } });
	}

	async buildModal(
		_: Logos.Interaction<any, any>,
		{ locale }: Logos.InteractionLocaleData,
		{ formData }: { formData: AnswerFormData },
	): Promise<Modal<AnswerFormData>> {
		const strings = {
			title: this.client.localise("answer.title", locale)(),
			fields: {
				question: this.client.localise("answer.fields.question", locale)(),
				answer: this.client.localise("answer.fields.answer", locale)(),
			},
		};

		return {
			title: strings.title,
			elements: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "question",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.question, 45),
							style: Discord.TextStyles.Paragraph,
							required: false,
							value: formData.question,
						},
					],
				},
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "answer",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.answer, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							value: formData.answer,
						},
					],
				},
			],
		};
	}
}

export { handleStartAnswering };
