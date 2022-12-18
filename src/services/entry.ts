import { Bot, Interaction, InteractionTypes } from 'discordeno';
import {
	handleAcceptRules,
	handleRequestVerification,
	handleSelectLanguageProficiency,
} from 'logos/src/services/entry-stages/mod.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client } from 'logos/src/client.ts';
import { createInteractionCollector } from 'logos/src/interactions.ts';
import { staticComponentIds } from 'logos/constants.ts';

type EntryInteractionHandler = (
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	parameter: string,
) => Promise<void> | void;

const interactionHandlers: Record<string, EntryInteractionHandler> = {
	[staticComponentIds.acceptedRules]: handleAcceptRules,
	[staticComponentIds.requestedVerification]: handleRequestVerification,
	[staticComponentIds.selectedLanguageProficiency]: handleSelectLanguageProficiency,
};

const service: ServiceStarter = setupEntryProcess;

function setupEntryProcess([client, bot]: [Client, Bot]): void {
	for (const step of Object.keys(interactionHandlers)) {
		createInteractionCollector([client, bot], {
			type: InteractionTypes.MessageComponent,
			customId: step,
			doesNotExpire: true,
			onCollect: (_bot, interaction) => {
				const selectionCustomId = interaction.data?.customId;
				if (selectionCustomId === undefined) return;

				const [step, parameter] = selectionCustomId.split('|') as [string, string];
				const handleInteraction = interactionHandlers[step as keyof typeof interactionHandlers]!;

				return void handleInteraction([client, bot], interaction, parameter);
			},
		});
	}
}

export default service;
