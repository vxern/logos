import { trim } from "logos:core/formatting";
import { Modal, ModalComposer } from "logos/commands/components/modal-composers/modal-composer";
import { TicketFormData } from "logos/database/ticket";

class TicketComposer extends ModalComposer<TicketFormData, never> {
	async buildModal(
		_: Logos.Interaction<any, any>,
		{ locale }: Logos.InteractionLocaleData,
		{ formData }: { formData: TicketFormData },
	): Promise<Modal<TicketFormData>> {
		const strings = {
			title: this.client.localise("ticket.title", locale)(),
			topic: this.client.localise("ticket.fields.topic", locale)(),
		};

		return {
			title: strings.title,
			elements: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "topic",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.topic, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							maxLength: 100,
							value: formData.topic,
						},
					],
				},
			],
		};
	}
}

export { TicketComposer };
