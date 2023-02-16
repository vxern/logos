import { Bot, Interaction, InteractionTypes } from 'discordeno';
import {
	handleAcceptRules,
	handleRequestVerification,
	handleSelectLanguageProficiency,
} from 'logos/src/services/entry-stages/mod.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client } from 'logos/src/client.ts';
import { createInteractionCollector, decodeId } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';

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
