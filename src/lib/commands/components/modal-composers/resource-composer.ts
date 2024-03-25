import { trim } from "logos:core/formatting";
import { Modal, ModalComposer } from "logos/commands/components/modal-composers/modal-composer";
import { ResourceFormData } from "logos/database/resource";

class ResourceComposer extends ModalComposer<ResourceFormData, never> {
	async buildModal(
		_: Logos.Interaction,
		{ locale }: Logos.InteractionLocaleData,
		{ formData }: { formData: ResourceFormData },
	): Promise<Modal<ResourceFormData>> {
		const strings = {
			title: this.client.localise("resource.title", locale)(),
			fields: {
				resource: this.client.localise("resource.fields.resource", locale)(),
			},
		};

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
