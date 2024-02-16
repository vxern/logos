import * as Discord from "@discordeno/bot";
import constants from "../../../constants/constants";
import * as Logos from "../../../types";
import { InteractionCollector } from "../../client";
import { decodeId, getCommandName, getLocaleData } from "../../interactions";
import { GlobalService } from "../service";

type InteractionRepetitionButtonID = [interactionId: string];

// TODO(vxern): Improve this by getting rid of the "message could not be loaded" text.
class InteractionRepetitionService extends GlobalService {
	async start(): Promise<void> {}

	async stop(): Promise<void> {}

	async interactionCreate(interaction: Discord.Interaction): Promise<void> {
		if (interaction.type === Discord.InteractionTypes.ApplicationCommand) {
			this.handleApplicationCommand(interaction);
			return;
		}

		const customId = interaction.data?.customId;
		if (customId === undefined) {
			return;
		}

		const [id, interactionId] = decodeId<InteractionRepetitionButtonID>(customId);
		if (id !== constants.components.showInChat) {
			return;
		}

		await this.client.postponeReply(interaction);

		const confirmButton = new InteractionCollector({ only: [interaction.user.id], isSingle: true });
		const cancelButton = new InteractionCollector({ only: [interaction.user.id], isSingle: true });

		confirmButton.onCollect(async (buttonPress) => {
			this.client.deleteReply(interaction);

			const originalInteraction = this.client.unregisterInteraction(BigInt(interactionId));
			if (originalInteraction === undefined) {
				return;
			}

			this.client.deleteReply(originalInteraction);

			const interactionSpoofed = InteractionRepetitionService.#spoofInteraction(originalInteraction, {
				using: buttonPress,
			});

			await this.client.handleInteraction(interactionSpoofed, { show: true });
		});

		cancelButton.onCollect(async (_) => this.client.deleteReply(interaction));

		this.client.registerInteractionCollector(confirmButton);
		this.client.registerInteractionCollector(cancelButton);

		const localeData = await getLocaleData(this.client, interaction);

		const locale = localeData.locale;

		const strings = {
			title: this.client.localise("interactions.show.sureToShow.title", locale)(),
			description: this.client.localise("interactions.show.sureToShow.description", locale)(),
			yes: this.client.localise("interactions.show.sureToShow.yes", locale)(),
			no: this.client.localise("interactions.show.sureToShow.no", locale)(),
		};

		this.client.editReply(interaction, {
			embeds: [{ title: strings.title, description: strings.description, color: constants.colors.dullYellow }],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: confirmButton.customId,
							label: strings.yes,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: cancelButton.customId,
							label: strings.no,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});
	}

	async handleApplicationCommand(interaction: Discord.Interaction): Promise<void> {
		const commandName = getCommandName(interaction);
		if (commandName === undefined) {
			return;
		}

		if (!this.client.isShowable(commandName)) {
			return;
		}

		this.client.registerInteraction(interaction);
	}

	static #spoofInteraction(
		interaction: Discord.Interaction | Logos.Interaction,
		{ using }: { using: Discord.Interaction },
	): Discord.Interaction | Logos.Interaction {
		return {
			...interaction,
			type: Discord.InteractionTypes.ApplicationCommand,
			token: using.token,
			id: using.id,
		};
	}
}

export { InteractionRepetitionService };
export type { InteractionRepetitionButtonID };
