import { trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { Modal, ModalComposer } from "logos/commands/components/modal-composers/modal-composer";

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

export { AnswerComposer };
