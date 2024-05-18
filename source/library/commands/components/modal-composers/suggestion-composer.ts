import { trim } from "logos:core/formatting";
import type { Client } from "logos/client";
import { type Modal, ModalComposer } from "logos/commands/components/modal-composers/modal-composer";
import type { SuggestionFormData } from "logos/models/suggestion";

class SuggestionComposer extends ModalComposer<SuggestionFormData, never> {
	constructor(client: Client, { interaction }: { interaction: Logos.Interaction }) {
		super(client, { interaction, initialFormData: { suggestion: "" } });
	}

	buildModal(
		submission: Logos.Interaction,
		{ formData }: { formData: SuggestionFormData },
	): Modal<SuggestionFormData> {
		const strings = constants.contexts.suggestionModal({
			localise: this.client.localise.bind(this.client),
			locale: submission.locale,
		});

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
