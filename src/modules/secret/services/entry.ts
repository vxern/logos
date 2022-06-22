import {
	InteractionType,
	MessageComponentInteraction,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { ServiceStarter } from '../../service.ts';
import { createInteractionCollector } from '../../../utils.ts';
import { onAcceptRules } from './entry/accept-rules.ts';
import { onSelectLanguageProficiency } from './entry/select-language-proficiency.ts';

const steps = [
	'ACCEPTED_RULES',
	'SELECTED_LANGUAGE_PROFICIENCY',
] as const;
type Step = (typeof steps)[number];

type EntryInteractionHandler = (
	client: Client,
	interaction: MessageComponentInteraction,
	parameter: string,
) => Promise<void> | void;

const interactionHandlers: { [key in Step]: EntryInteractionHandler } = {
	'ACCEPTED_RULES': onAcceptRules,
	'SELECTED_LANGUAGE_PROFICIENCY': onSelectLanguageProficiency,
};

const service: ServiceStarter = (client) => {
	for (const step of steps) {
		const [collector] = createInteractionCollector(client, {
			type: InteractionType.MESSAGE_COMPONENT,
			customID: step,
			endless: true,
		});

		collector.on(
			'collect',
			(interaction: MessageComponentInteraction) => {
				const [step, parameter] = interaction.data!.custom_id.split('|') as [
					Step,
					string,
				];

				interactionHandlers[step]!(client, interaction, parameter);
			},
		);
	}
};

export default service;
