import { trim } from "logos:core/formatting";
import { Modal, ModalComposer } from "logos/commands/components/modal-composers/modal-composer";
import { EntryRequestFormData } from "logos/database/entry-request";

class EntryRequestComposer extends ModalComposer<EntryRequestFormData, never> {
	async buildModal(
		_: Logos.Interaction,
		{ featureLanguage, locale }: Logos.InteractionLocaleData,
		{ formData }: { formData: EntryRequestFormData },
	): Promise<Modal<EntryRequestFormData>> {
		const strings = {
			title: this.client.localise("verification.title", locale)(),
			fields: {
				reason: this.client.localise("verification.fields.reason", locale)({ language: featureLanguage }),
				aim: this.client.localise("verification.fields.aim", locale)(),
				whereFound: this.client.localise("verification.fields.whereFound", locale)(),
			},
		};

		return {
			title: strings.title,
			elements: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "reason",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.reason, 45),
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
