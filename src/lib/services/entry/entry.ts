import { Bot, Interaction, InteractionTypes } from 'discordeno';
import { handleAcceptRules } from 'logos/src/lib/services/entry/stages/accept-rules.ts';
import { handleRequestVerification } from 'logos/src/lib/services/entry/stages/get-verified.ts';
import { handleSelectLanguageProficiency } from 'logos/src/lib/services/entry/stages/select-language-proficiency.ts';
import { ServiceStarter } from 'logos/src/lib/services/services.ts';
import { Client, isServicing } from 'logos/src/lib/client.ts';
import { createInteractionCollector, decodeId } from 'logos/src/lib/interactions.ts';
import constants from 'logos/src/constants.ts';

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
