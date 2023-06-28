import { Bot, Interaction, InteractionTypes } from "discordeno";
import { handleAcceptRules } from "./stages/accept-rules.js";
import { handleRequestVerification } from "./stages/get-verified.js";
import { handleSelectLanguageProficiency } from "./stages/select-language-proficiency.js";
import { ServiceStarter } from "../services.js";
import { Client, isServicing } from "../../client.js";
import { createInteractionCollector, decodeId } from "../../interactions.js";
import constants from "../../../constants.js";

type EntryInteractionHandler = (
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	parameter: string,
) => Promise<void> | void;

const interactionHandlers: Record<string, EntryInteractionHandler> = {
	[constants.staticComponentIds.acceptedRules]: handleAcceptRules,
	[constants.staticComponentIds.requestedVerification]: handleRequestVerification,
	[constants.staticComponentIds.selectedLanguageProficiency]: handleSelectLanguageProficiency,
};

const service: ServiceStarter = setupEntryProcess;

type EntryStepButtonID = [parameter: string];

function setupEntryProcess([client, bot]: [Client, Bot]): void {
	for (const step of Object.keys(interactionHandlers)) {
		createInteractionCollector([client, bot], {
			type: InteractionTypes.MessageComponent,
			customId: step,
			doesNotExpire: true,
			onCollect: (_bot, interaction) => {
				if (!isServicing(client, interaction.guildId!)) return;

				const selectionCustomId = interaction.data?.customId;
				if (selectionCustomId === undefined) return;

				const [stepId, parameter] = decodeId<EntryStepButtonID>(selectionCustomId);
				const handleInteraction = interactionHandlers[stepId as keyof typeof interactionHandlers]!;

				return void handleInteraction([client, bot], interaction, parameter);
			},
		});
	}
}

export default service;
export type { EntryStepButtonID };
