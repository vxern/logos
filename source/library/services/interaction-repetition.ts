import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { GlobalService } from "logos/services/service";
import { InteractionStore } from "logos/stores/interactions";

class InteractionRepetitionService extends GlobalService {
	readonly #commandInteractions: InteractionCollector;
	readonly #showInChatButtons: InteractionCollector<[interactionId: string]>;

	constructor(client: Client) {
		super(client, { identifier: "InteractionRepetitionService" });

		this.#commandInteractions = new InteractionCollector(client, {
			type: Discord.InteractionTypes.ApplicationCommand,
			anyCustomId: true,
			isPermanent: true,
		});
		this.#showInChatButtons = new InteractionCollector<[interactionId: string]>(client, {
			customId: constants.components.showInChat,
			isPermanent: true,
		});
	}

	async start(): Promise<void> {
		this.#commandInteractions.onInteraction(this.#handleCommandInteraction.bind(this));
		this.#showInChatButtons.onInteraction(this.#handleShowInChat.bind(this));

		await this.client.registerInteractionCollector(this.#commandInteractions);
		await this.client.registerInteractionCollector(this.#showInChatButtons);
	}

	async stop(): Promise<void> {
		await this.#commandInteractions.close();
		await this.#showInChatButtons.close();
	}

	#handleCommandInteraction(interaction: Logos.Interaction): void {
		if (!this.client.isShowable(interaction)) {
			return;
		}

		this.client.registerInteraction(interaction);
	}

	async #handleShowInChat(buttonPress: Logos.Interaction<[interactionId: string]>): Promise<void> {
		await this.client.postponeReply(buttonPress);

		const confirmButton = new InteractionCollector(this.client, {
			only: [buttonPress.user.id],
			dependsOn: this.#showInChatButtons,
			isSingle: true,
		});
		const cancelButton = new InteractionCollector(this.client, {
			only: [buttonPress.user.id],
			dependsOn: this.#showInChatButtons,
			isSingle: true,
		});

		confirmButton.onInteraction(async (confirmButtonPress) => {
			await this.client.deleteReply(buttonPress);

			const originalInteraction = this.client.unregisterInteraction(BigInt(buttonPress.metadata[1]));
			if (originalInteraction === undefined) {
				return;
			}

			await this.client.deleteReply(originalInteraction);

			const interactionSpoofed = InteractionStore.spoofInteraction(originalInteraction, {
				using: confirmButtonPress,
				parameters: { "@repeat": true, show: true },
			});

			await this.client.receiveInteraction(interactionSpoofed);
		});

		cancelButton.onInteraction(async (_) => this.client.deleteReply(buttonPress));

		await this.client.registerInteractionCollector(confirmButton);
		await this.client.registerInteractionCollector(cancelButton);

		const strings = constants.contexts.sureToShow({
			localise: this.client.localise,
			locale: buttonPress.locale,
		});
		await this.client.pushedBack(buttonPress, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
				},
			],
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

	getShowButton(interaction: Logos.Interaction): Discord.ButtonComponent {
		const strings = constants.contexts.show({
			localise: this.client.localise,
			locale: interaction.locale,
		});
		return {
			type: Discord.MessageComponentTypes.Button,
			style: Discord.ButtonStyles.Primary,
			label: strings.show,
			emoji: { name: constants.emojis.showInChat },
			customId: this.#showInChatButtons.encodeId([interaction.id.toString()]),
		};
	}
}

export { InteractionRepetitionService };
