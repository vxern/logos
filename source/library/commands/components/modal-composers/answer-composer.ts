import { trim } from "logos:core/formatting";
import type { Client } from "logos/client";
import { type Modal, ModalComposer } from "logos/commands/components/modal-composers/modal-composer";

interface AnswerFormData {
	readonly question: string;
	readonly answer: string;
}
class AnswerComposer extends ModalComposer<AnswerFormData, never> {
	constructor(client: Client, { interaction, question }: { interaction: Logos.Interaction; question: string }) {
		super(client, { interaction, initialFormData: { question: trim(question, 4000), answer: "" } });
	}

	buildModal(submission: Logos.Interaction, { formData }: { formData: AnswerFormData }): Modal<AnswerFormData> {
		const strings = constants.contexts.answerModal({
			localise: this.client.localise,
			locale: submission.locale,
		});

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
