import { trim } from "logos:core/formatting";
import { Client } from "logos/client";
import { Modal, ModalComposer } from "logos/commands/components/modal-composers/modal-composer";

interface CorrectionFormData {
	readonly original: string;
	readonly corrected: string;
}
type ValidationError = "texts-not-different";
class CorrectionComposer extends ModalComposer<CorrectionFormData, ValidationError> {
	constructor(
		client: Client,
		{
			interaction,
			text,
			prefillCorrectedField,
		}: { interaction: Logos.Interaction; text: string; prefillCorrectedField: boolean },
	) {
		super(client, { interaction, initialFormData: { original: text, corrected: prefillCorrectedField ? text : "" } });
	}

	async buildModal(
		submission: Logos.Interaction,
		{ formData }: { formData: CorrectionFormData },
	): Promise<Modal<CorrectionFormData>> {
		const strings = constants.contexts.correctionModal({ localise: this.client.localise, locale: submission.locale });

		return {
			title: strings.title,
			elements: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "original",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.original, 45),
							style: Discord.TextStyles.Paragraph,
							required: false,
							value: formData.original,
						},
					],
				},
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "corrected",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.corrected, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							value: formData.corrected,
						},
					],
				},
			],
		};
	}

	async validate({ formData }: { formData: CorrectionFormData }): Promise<ValidationError | undefined> {
		if (formData.corrected === formData.original) {
			return "texts-not-different";
		}

		return undefined;
	}

	getErrorMessage(
		submission: Logos.Interaction,
		{ error }: { error: ValidationError },
	): Discord.CamelizedDiscordEmbed | undefined {
		switch (error) {
			case "texts-not-different": {
				const strings = constants.contexts.correctionTextsNotDifferent({
					localise: this.client.localise,
					locale: submission.locale,
				});

				return {
					title: strings.title,
					description: strings.description,
					color: constants.colours.warning,
				};
			}
		}
	}
}

export { CorrectionComposer };
