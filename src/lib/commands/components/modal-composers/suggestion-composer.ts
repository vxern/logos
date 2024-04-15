import { trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { Modal, ModalComposer } from "logos/commands/components/modal-composers/modal-composer";
import { SuggestionFormData } from "logos/database/suggestion";

class SuggestionComposer extends ModalComposer<SuggestionFormData, never> {
	constructor(client: Client, { interaction }: { interaction: Logos.Interaction }) {
		super(client, { interaction, initialFormData: { suggestion: "" } });
	}

	async buildModal(
		submission: Logos.Interaction,
		{ formData }: { formData: SuggestionFormData },
	): Promise<Modal<SuggestionFormData>> {
		const locale = submission.locale;
		const strings = {
			title: this.client.localise("suggestion.title", locale)(),
			fields: {
				suggestion: this.client.localise("suggestion.fields.suggestion", locale)(),
			},
		};

		return {
			title: strings.title,
			elements: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "suggestion",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.suggestion, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							value: formData.suggestion,
						},
					],
				},
			],
		};
	}
}

export { SuggestionComposer };
