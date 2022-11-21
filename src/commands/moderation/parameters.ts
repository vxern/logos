import { ApplicationCommandOptionTypes } from 'discordeno';
import { createLocalisations, Parameters } from 'logos/assets/localisations/mod.ts';
import { OptionBuilder } from 'logos/src/commands/mod.ts';

const duration: OptionBuilder = {
	...createLocalisations(Parameters.moderation.duration),
	type: ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const reason: OptionBuilder = {
	...createLocalisations(Parameters.moderation.reason),
	type: ApplicationCommandOptionTypes.String,
	required: true,
};

export { duration, reason };
