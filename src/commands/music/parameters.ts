import { ApplicationCommandOptionTypes } from 'discordeno';
import { Parameters } from '../../../assets/localisations/parameters.ts';
import { createLocalisations } from '../../../assets/localisations/types.ts';
import { OptionBuilder } from '../../commands/command.ts';

const index: OptionBuilder = {
	...createLocalisations(Parameters.music.index),
	type: ApplicationCommandOptionTypes.Integer,
	required: false,
};

const query: OptionBuilder = {
	...createLocalisations(Parameters.music.query),
	type: ApplicationCommandOptionTypes.String,
	required: true,
};

const byTimestamp: OptionBuilder = {
	...createLocalisations(Parameters.music.byTimestamp),
	type: ApplicationCommandOptionTypes.Integer,
	required: false,
};

const toTimestamp: OptionBuilder = {
	...createLocalisations(Parameters.music.toTimestamp),
	type: ApplicationCommandOptionTypes.Integer,
	required: false,
};

const collection: OptionBuilder = {
	...createLocalisations(Parameters.music.collection),
	type: ApplicationCommandOptionTypes.Boolean,
};

const by: OptionBuilder = {
	...createLocalisations(Parameters.music.by),
	type: ApplicationCommandOptionTypes.Integer,
};

const to: OptionBuilder = {
	...createLocalisations(Parameters.music.to),
	type: ApplicationCommandOptionTypes.Integer,
};

export { by, byTimestamp, collection, index, query, to, toTimestamp };
