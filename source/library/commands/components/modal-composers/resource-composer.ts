import { trim } from "logos:core/formatting";
import { type Modal, ModalComposer } from "logos/commands/components/modal-composers/modal-composer";
import type { ResourceFormData } from "logos/models/resource";

class ResourceComposer extends ModalComposer<ResourceFormData, never> {
	buildModal(submission: Logos.Interaction, { formData }: { formData: ResourceFormData }): Modal<ResourceFormData> {
		const strings = constants.contexts.resourceModal({
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
