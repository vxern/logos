import { Locale } from "logos:constants/languages";
import { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { GlobalService } from "logos/services/service";
import { InteractionStore } from "logos/stores/interactions";

// TODO(vxern): Improve this by getting rid of the "message could not be loaded" text.
class InteractionRepetitionService extends GlobalService {
	readonly #_commandInteractions: InteractionCollector;
	readonly #_showInChatButtons: InteractionCollector<[interactionId: string]>;

	constructor(client: Client) {
		super(client, { identifier: "InteractionRepetitionService" });

		this.#_commandInteractions = new InteractionCollector(client, {
			type: Discord.InteractionTypes.ApplicationCommand,
			anyCustomId: true,
			isPermanent: true,
		});
		this.#_showInChatButtons = new InteractionCollector<[interactionId: string]>(client, {
			customId: constants.components.showInChat,
			isPermanent: true,
		});
	}

	async start(): Promise<void> {
		this.#_commandInteractions.onInteraction(this.#_handleCommandInteraction.bind(this));
		this.#_showInChatButtons.onInteraction(this.#_handleShowInChat.bind(this));

		await this.client.registerInteractionCollector(this.#_commandInteractions);
		await this.client.registerInteractionCollector(this.#_showInChatButtons);
	}

	async stop(): Promise<void> {
		await this.#_commandInteractions.close();
		await this.#_showInChatButtons.close();
	}

	async #_handleCommandInteraction(interaction: Logos.Interaction): Promise<void> {
		if (!this.client.isShowable(interaction)) {
			return;
		}

		this.client.registerInteraction(interaction);
	}

	async #_handleShowInChat(buttonPress: Logos.Interaction<[interactionId: string]>): Promise<void> {
		await this.client.postponeReply(buttonPress);

		const confirmButton = new InteractionCollector(this.client, {
			only: [buttonPress.user.id],
			dependsOn: this.#_showInChatButtons,
			isSingle: true,
		});
		const cancelButton = new InteractionCollector(this.client, {
			only: [buttonPress.user.id],
			dependsOn: this.#_showInChatButtons,
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

			await this.client.handleInteraction(interactionSpoofed);
		});

		cancelButton.onInteraction(async (_) => this.client.deleteReply(buttonPress));

		await this.client.registerInteractionCollector(confirmButton);
		await this.client.registerInteractionCollector(cancelButton);

		const locale = buttonPress.locale;

		const strings = {
			title: this.client.localise("interactions.show.sureToShow.title", locale)(),
			description: this.client.localise("interactions.show.sureToShow.description", locale)(),
			yes: this.client.localise("interactions.show.sureToShow.yes", locale)(),
			no: this.client.localise("interactions.show.sureToShow.no", locale)(),
		};

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

	getShowButton(interaction: Logos.Interaction, { locale }: { locale: Locale }): Discord.ButtonComponent {
		const strings = {
			show: this.client.localise("interactions.show", locale)(),
		};

		return {
			type: Discord.MessageComponentTypes.Button,
			style: Discord.ButtonStyles.Primary,
			label: strings.show,
			emoji: { name: constants.emojis.showInChat },
			customId: this.#_showInChatButtons.encodeId([interaction.id.toString()]),
		};
	}
}

export { InteractionRepetitionService };
