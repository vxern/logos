import * as Discord from "@discordeno/bot";
import constants from "../../../constants/constants";
import { handleInteractionCreate } from "../../client";
import { decodeId, deleteReply, getCommandName } from "../../interactions";
import { GlobalService } from "../service";

type InteractionRepetitionButtonID = [interactionId: string];

class InteractionRepetitionService extends GlobalService {
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

		const originalInteraction = this.client.cache.interactions.get(interactionId);
		if (originalInteraction === undefined) {
			return;
		}

		this.client.cache.interactions.delete(interactionId);

		deleteReply([this.client, this.bot], originalInteraction);

		const interactionSpoofed: Discord.Interaction = {
			...originalInteraction,
			type: Discord.InteractionTypes.ApplicationCommand,
			token: interactionRaw.token,
			id: interactionRaw.id,
		};

		return handleInteractionCreate([this.client, this.bot], interactionSpoofed, { show: true });
	}

	async handleApplicationCommand(interaction: Discord.Interaction): Promise<void> {
		const commandName = getCommandName(interaction);
		if (commandName === undefined) {
			return;
		}

		if (!this.client.commands.showable.includes(commandName)) {
			return;
		}

		this.client.cache.interactions.set(interaction.id.toString(), interaction);
	}
}

export { InteractionRepetitionService };
export type { InteractionRepetitionButtonID };
