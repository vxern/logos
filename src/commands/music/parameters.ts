import { ApplicationCommandOptionTypes } from '../../../deps.ts';
import { OptionBuilder } from '../../commands/structs/command.ts';

const index: OptionBuilder = {
	name: 'index',
	nameLocalizations: {
		pl: 'indeks',
		ro: 'index',
	},
	description: 'The index of the song listing in the queue.',
	descriptionLocalizations: {
		pl: 'Indeks wpisu w kolejce.',
		ro: 'Indexul înregistrării în coadă.',
	},
	type: ApplicationCommandOptionTypes.Integer,
	required: false,
};

const titleOrUrl: OptionBuilder = {
	name: 'title-or-url',
	nameLocalizations: {
		pl: 'tytuł-lub-url',
		ro: 'titlu-sau-url',
	},
	description: 'The title of or the link to the song or song collection.',
	descriptionLocalizations: {
		pl: 'Tytuł lub link do utworu lub zbioru utworów.',
		ro: 'Titlul sau link-ul către melodie sau către unui set de melodii.',
	},
	type: ApplicationCommandOptionTypes.String,
	required: false,
};

const by: OptionBuilder = {
	name: 'by',
	nameLocalizations: {
		pl: 'o',
		ro: 'cu',
	},
	description: 'The time period representation in the format `hh:mm:ss`.',
	descriptionLocalizations: {
		pl: 'Reprezentacja okresu czasowego w formacie `gg:mm:ss`.',
		ro: 'Reprezentarea unei perioade de timp în formatul `oo:mm:ss`.',
	},
	type: ApplicationCommandOptionTypes.Integer,
	required: false,
};

const to: OptionBuilder = {
	name: 'to',
	nameLocalizations: {
		pl: 'do',
		ro: 'până la',
	},
	description: 'The time period representation in the format `hh:mm:ss`.',
	descriptionLocalizations: {
		pl: 'Reprezentacja okresu czasowego w formacie `gg:mm:ss`.',
		ro: 'Reprezentarea unei perioade de timp în formatul `oo:mm:ss`.',
	},
	type: ApplicationCommandOptionTypes.Integer,
	required: false,
};

export { by, index, titleOrUrl, to };
