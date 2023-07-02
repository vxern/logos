import constants from "../../../constants.js";
import { Client, isServicing } from "../../client.js";
import { createInteractionCollector, decodeId } from "../../interactions.js";
import { ServiceStarter } from "../services.js";
import { handleAcceptRules } from "./stages/accept-rules.js";
import { handleRequestVerification } from "./stages/get-verified.js";
import { handleSelectLanguageProficiency } from "./stages/select-language-proficiency.js";
import * as Discord from "discordeno";

type EntryInteractionHandler = (
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	parameter: string,
) => Promise<void>;

const interactionHandlers = {
	[constants.staticComponentIds.entry.acceptedRules]: handleAcceptRules,
	[constants.staticComponentIds.entry.requestedVerification]: handleRequestVerification,
	[constants.staticComponentIds.entry.selectedLanguageProficiency]: handleSelectLanguageProficiency,
} satisfies Record<string, EntryInteractionHandler>;

const service: ServiceStarter = setupEntryProcess;

type EntryStepButtonID = [parameter: string];

function setupEntryProcess([client, bot]: [Client, Discord.Bot]): void {
	for (const step of Object.keys(interactionHandlers)) {
		createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			customId: step,
			doesNotExpire: true,
			onCollect: async (_bot, interaction) => {
				const guildId = interaction.guildId;
				if (guildId === undefined) {
					return;
				}

				if (!isServicing(client, guildId)) {
					return;
				}

				const selectionCustomId = interaction.data?.customId;
				if (selectionCustomId === undefined) {
					return;
				}

				const [stepId, parameter] = decodeId<EntryStepButtonID>(selectionCustomId);
				const handleInteraction = interactionHandlers[stepId as keyof typeof interactionHandlers];
				if (handleInteraction === undefined) {
					client.log.warn(`Failed to match step ID '${stepId}' to interaction handler.`);
					return;
				}

				handleInteraction([client, bot], interaction, parameter);
			},
		});
	}
}

export default service;
export type { EntryStepButtonID };
