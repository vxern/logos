import { Interaction, InteractionTypes } from '../../deps.ts';
import { Client } from '../client.ts';
import { ServiceStarter } from './service.ts';
import { createInteractionCollector } from '../utils.ts';
import { onAcceptRules } from './entry/accept-rules.ts';
import { onSelectLanguageProficiency } from './entry/select-language-proficiency.ts';

const entrySteps = [
	'ACCEPTED_RULES',
	'SELECTED_LANGUAGE_PROFICIENCY',
] as const;
type Step = (typeof entrySteps)[number];

type EntryInteractionHandler = (
	client: Client,
	interaction: Interaction & { type: InteractionTypes.MessageComponent },
	parameter: string,
) => Promise<void> | void;

const interactionHandlers: { [key in Step]: EntryInteractionHandler } = {
	'ACCEPTED_RULES': onAcceptRules,
	'SELECTED_LANGUAGE_PROFICIENCY': onSelectLanguageProficiency,
};

const service: ServiceStarter = (client) => {
	for (const entryStep of entrySteps) {
		createInteractionCollector(client, {
			type: InteractionTypes.MessageComponent,
			customId: entryStep,
			doesNotExpire: true,
			onCollect: (_bot, interaction) => {
				const selectionCustomId = interaction.data?.customId;
				if (!selectionCustomId) return;

				const stepAndParameter = selectionCustomId.split('|');
				if (stepAndParameter.length !== 2) return;

				const [step, parameter] = <[Step, string]> stepAndParameter;

				interactionHandlers[step](
					client,
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
