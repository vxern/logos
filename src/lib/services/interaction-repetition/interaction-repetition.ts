import * as Discord from "@discordeno/bot";
import constants from "../../../constants/constants";
import * as Logos from "../../../types";
import {
	createInteractionCollector,
	decodeId,
	deleteReply,
	editReply,
	getCommandName,
	getLocaleData,
	postponeReply,
} from "../../interactions";
import { GlobalService } from "../service";

type InteractionRepetitionButtonID = [interactionId: string];

class InteractionRepetitionService extends GlobalService {
	async start(): Promise<void> {}

	async stop(): Promise<void> {}

	async interactionCreate(interactionRaw: Discord.Interaction): Promise<void> {
		if (interactionRaw.type === Discord.InteractionTypes.ApplicationCommand) {
			this.handleApplicationCommand(interactionRaw);
			return;
		}

		const customId = interactionRaw.data?.customId;
		if (customId === undefined) {
			return;
		}

		const [id, interactionId] = decodeId<InteractionRepetitionButtonID>(customId);
		if (id !== constants.components.showInChat) {
			return;
		}

		await postponeReply(this.client, interactionRaw);

		const confirmCustomId = createInteractionCollector(this.client, {
			type: Discord.InteractionTypes.MessageComponent,
			userId: interactionRaw.user.id,
			limit: 1,
			onCollect: async (selection) => {
				deleteReply(this.client, interactionRaw);

				const originalInteraction = this.client.unregisterInteraction(BigInt(interactionId));
				if (originalInteraction === undefined) {
					return;
				}

				deleteReply(this.client, originalInteraction);

				const interactionSpoofed = InteractionRepetitionService.#spoofInteraction(originalInteraction, {
					using: selection,
				});

				await this.client.handleInteraction(interactionSpoofed, { show: true });
			},
		});

		const cancelCustomId = createInteractionCollector(this.client, {
			type: Discord.InteractionTypes.MessageComponent,
			userId: interactionRaw.user.id,
			limit: 1,
			onCollect: async (_) => deleteReply(this.client, interactionRaw),
		});

		const localeData = await getLocaleData(this.client, interactionRaw);

		const locale = localeData.locale;

		const strings = {
			title: this.client.localise("interactions.show.sureToShow.title", locale)(),
			description: this.client.localise("interactions.show.sureToShow.description", locale)(),
			yes: this.client.localise("interactions.show.sureToShow.yes", locale)(),
			no: this.client.localise("interactions.show.sureToShow.no", locale)(),
		};

		editReply(this.client, interactionRaw, {
			embeds: [{ title: strings.title, description: strings.description, color: constants.colors.dullYellow }],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: confirmCustomId,
							label: strings.yes,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: cancelCustomId,
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
