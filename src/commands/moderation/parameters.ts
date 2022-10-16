import { Parameters } from '../../../assets/localisations/parameters.ts';
import { createLocalisations } from '../../../assets/localisations/types.ts';
import { ApplicationCommandOptionTypes } from '../../../deps.ts';
import { OptionBuilder } from '../../commands/command.ts';

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
