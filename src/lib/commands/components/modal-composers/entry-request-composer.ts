import { trim } from "logos:core/formatting";
import { Modal, ModalComposer } from "logos/commands/components/modal-composers/modal-composer";
import { EntryRequestFormData } from "logos/database/entry-request";

class EntryRequestComposer extends ModalComposer<EntryRequestFormData, never> {
	async buildModal(
		submission: Logos.Interaction,
		{ formData }: { formData: EntryRequestFormData },
	): Promise<Modal<EntryRequestFormData>> {
		const strings = constants.contexts.verificationModal({ localise: this.client.localise, locale: submission.locale });
		return {
			title: strings.title,
			elements: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "reason",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.reason({ language: submission.featureLanguage }), 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							value: formData.reason,
						},
					],
				},
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "aim",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.aim, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							value: formData.aim,
						},
					],
				},
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "whereFound",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.whereFound, 45),
							style: Discord.TextStyles.Short,
							required: true,
							value: formData.whereFound,
						},
					],
				},
			],
		};
	}
}

export { EntryRequestComposer };
