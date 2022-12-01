import { Bot, Interaction, InteractionTypes } from 'discordeno';
import { onAcceptRules } from 'logos/src/services/entry/stages/accept-rules.ts';
import { onSelectLanguageProficiency } from 'logos/src/services/entry/stages/select-language-proficiency.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client } from 'logos/src/client.ts';
import { createInteractionCollector } from 'logos/src/utils.ts';

const entrySteps = [
	'ACCEPTED_RULES',
	'SELECTED_LANGUAGE_PROFICIENCY',
] as const;
type Step = (typeof entrySteps)[number];

type EntryInteractionHandler = (
	[client, bot]: [Client, Bot],
	interaction: Interaction & { type: InteractionTypes.MessageComponent },
	parameter: string,
) => Promise<void> | void;

const interactionHandlers: { [key in Step]: EntryInteractionHandler } = {
	'ACCEPTED_RULES': onAcceptRules,
	'SELECTED_LANGUAGE_PROFICIENCY': onSelectLanguageProficiency,
};

const service: ServiceStarter = (clientWithBot) => {
	for (const entryStep of entrySteps) {
		createInteractionCollector(clientWithBot, {
			type: InteractionTypes.MessageComponent,
			customId: entryStep,
			doesNotExpire: true,
			onCollect: (_bot, interaction) => {
				const selectionCustomId = interaction.data?.customId;
				if (selectionCustomId === undefined) return;

				const [step, parameter] = <[Step, string]> selectionCustomId.split('|');

				const handleInteraction = interactionHandlers[step];

				return void handleInteraction(
					clientWithBot,
					<Interaction & {
						type: InteractionTypes.MessageComponent;
					}> interaction,
					parameter,
				);
			},
		});
	}
};

export default service;
