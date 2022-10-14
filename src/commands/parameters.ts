import { GlobalParameters } from '../../assets/localisations/commands.ts';
import { createLocalisations } from '../../assets/localisations/types.ts';
import { ApplicationCommandOptionTypes } from '../../deps.ts';
import { OptionBuilder } from './command.ts';

const elements: OptionBuilder = {
	...createLocalisations(GlobalParameters.elements),
	type: ApplicationCommandOptionTypes.Integer,
	required: true,
};

const index: OptionBuilder = {
	...createLocalisations(GlobalParameters.index),
	type: ApplicationCommandOptionTypes.Integer,
	required: true,
};

const user: OptionBuilder = {
	...createLocalisations(GlobalParameters.user),
	type: ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const show: OptionBuilder = {
	...createLocalisations(GlobalParameters.show),
	type: ApplicationCommandOptionTypes.Boolean,
};

export { elements, index, show, user };
