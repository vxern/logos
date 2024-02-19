import * as Discord from "@discordeno/bot";
import constants from "../../../constants/constants";
import * as Logos from "../../../types";
import { Client, InteractionCollector, InteractionStore } from "../../client";
import { GlobalService } from "../service";

// TODO(vxern): Improve this by getting rid of the "message could not be loaded" text.
class InteractionRepetitionService extends GlobalService {
	readonly #_commandInteractions: InteractionCollector;
	readonly #_showInChatButtonPresses: InteractionCollector;

	constructor(client: Client) {
		super(client);

		// TODO(vxern): Does this actually register command interactions without a custom ID?
		this.#_commandInteractions = new InteractionCollector(client, {
			type: Discord.InteractionTypes.ApplicationCommand,
			isPermanent: true,
		});
		this.#_showInChatButtonPresses = new InteractionCollector<[interactionId: string]>(client, {
			customId: constants.components.showInChat,
			isPermanent: true,
		});
	}

	async start(): Promise<void> {
		this.#_commandInteractions.onCollect(this.#handleCommandInteraction.bind(this));
		this.#_showInChatButtonPresses.onCollect(this.#handleShowInChat.bind(this));

		this.client.registerInteractionCollector(this.#_commandInteractions);
		this.client.registerInteractionCollector(this.#_showInChatButtonPresses);
	}

	async stop(): Promise<void> {
		await this.#_commandInteractions.close();
		await this.#_showInChatButtonPresses.close();
	}

	async #handleCommandInteraction(interaction: Logos.Interaction): Promise<void> {
		if (!this.client.isShowable(interaction)) {
			return;
		}

		this.client.registerInteraction(interaction);
	}

	async #handleShowInChat(buttonPress: Logos.Interaction): Promise<void> {
		await this.client.postponeReply(buttonPress);

		const confirmButton = new InteractionCollector(this.client, {
			only: [buttonPress.user.id],
			dependsOn: this.#_showInChatButtonPresses,
			isSingle: true,
		});
		const cancelButton = new InteractionCollector(this.client, {
			only: [buttonPress.user.id],
			dependsOn: this.#_showInChatButtonPresses,
			isSingle: true,
		});

		confirmButton.onCollect(async (confirmButtonPress) => {
			this.client.deleteReply(buttonPress);

			const originalInteraction = this.client.unregisterInteraction(BigInt(buttonPress.metadata[1]));
			if (originalInteraction === undefined) {
				return;
			}

			this.client.deleteReply(originalInteraction);

			const interactionSpoofed = InteractionStore.spoofInteraction(originalInteraction, {
				using: confirmButtonPress,
			});

			await this.client.handleInteraction(interactionSpoofed, { show: true });
		});

		cancelButton.onCollect(async (_) => this.client.deleteReply(buttonPress));

		this.client.registerInteractionCollector(confirmButton);
		this.client.registerInteractionCollector(cancelButton);

		const locale = buttonPress.locale;

		const strings = {
			title: this.client.localise("interactions.show.sureToShow.title", locale)(),
			description: this.client.localise("interactions.show.sureToShow.description", locale)(),
			yes: this.client.localise("interactions.show.sureToShow.yes", locale)(),
			no: this.client.localise("interactions.show.sureToShow.no", locale)(),
		};

		this.client.editReply(buttonPress, {
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
}

export { InteractionRepetitionService };
