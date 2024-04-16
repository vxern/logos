import { trim } from "logos:core/formatting";
import { Modal, ModalComposer } from "logos/commands/components/modal-composers/modal-composer";
import { ResourceFormData } from "logos/database/resource";

class ResourceComposer extends ModalComposer<ResourceFormData, never> {
	async buildModal(
		submission: Logos.Interaction,
		{ formData }: { formData: ResourceFormData },
	): Promise<Modal<ResourceFormData>> {
		const strings = constants.contexts.resourceModal({ localise: this.client.localise, locale: submission.locale });

		return {
			title: strings.title,
			elements: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "resource",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.fields.resource, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							value: formData.resource,
						},
					],
				},
			],
		};
	}
}

export { ResourceComposer };
