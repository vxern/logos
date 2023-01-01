import { ApplicationCommandOptionTypes } from 'discordeno';
import { createLocalisations, Parameters } from 'logos/assets/localisations/mod.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';

const elements: OptionBuilder = {
	...createLocalisations(Parameters.global.elements),
	type: ApplicationCommandOptionTypes.Integer,
	required: true,
};

const elementIndex: OptionBuilder = {
	...createLocalisations(Parameters.global.index),
	type: ApplicationCommandOptionTypes.Integer,
	required: true,
};

const user: OptionBuilder = {
	...createLocalisations(Parameters.global.user),
	type: ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const show: OptionBuilder = {
	...createLocalisations(Parameters.global.show),
	type: ApplicationCommandOptionTypes.Boolean,
};

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

const songIndex: OptionBuilder = {
	...createLocalisations(Parameters.music.index),
	type: ApplicationCommandOptionTypes.Integer,
	required: false,
};

const query: OptionBuilder = {
	...createLocalisations(Parameters.music.query),
	type: ApplicationCommandOptionTypes.String,
	required: true,
};

const timestamp: OptionBuilder = {
	...createLocalisations(Parameters.music.timestamp),
	type: ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
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

const role: OptionBuilder = {
	...createLocalisations(Parameters.social.roles),
	type: ApplicationCommandOptionTypes.Role,
	required: true,
};

export { by, collection, duration, elementIndex, elements, query, reason, role, show, songIndex, timestamp, to, user };
