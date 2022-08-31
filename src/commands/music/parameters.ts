import { ApplicationCommandOptionTypes } from '../../../deps.ts';
import { OptionBuilder } from '../../commands/command.ts';

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

const query: OptionBuilder = {
	name: 'query',
	nameLocalizations: {
		pl: 'zapytanie',
		ro: 'interogare',
	},
	description: 'The title or a link to the song or song collection.',
	descriptionLocalizations: {
		pl: 'Tytuł lub link do utworu lub zbioru utworów.',
		ro: 'Titlul sau link-ul către melodie sau către unui set de melodii.',
	},
	type: ApplicationCommandOptionTypes.String,
	required: true,
};

const byTimestamp: OptionBuilder = {
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

const toTimestamp: OptionBuilder = {
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

const collection: OptionBuilder = {
	name: 'collection',
	nameLocalizations: {
		pl: 'zbiór',
		ro: 'set',
	},
	description:
		'If set to true, the action will be taken on the song collection instead.',
	descriptionLocalizations: {
		pl: 'Jeśli tak, działanie zostanie wykonane na zbiorze utworów.',
		ro: 'Dacă da, acțiunea va fi efectuată pe set de melodii.',
	},
	type: ApplicationCommandOptionTypes.Boolean,
};

const by: OptionBuilder = {
	name: 'by',
	nameLocalizations: {
		pl: 'o',
		ro: 'cu',
	},
	description: 'The number of songs or song listings to skip by.',
	descriptionLocalizations: {
		pl: 'Liczba utworów lub wpisów, które mają być przewinięte.',
		ro: 'Numărul de melodii sau de înregistrări care să fie sărite peste.',
	},
	type: ApplicationCommandOptionTypes.Integer,
};

const to: OptionBuilder = {
	name: 'to',
	nameLocalizations: {
		pl: 'do',
		ro: 'până-la',
	},
	description: 'The index of the track to skip to.',
	descriptionLocalizations: {
		pl: 'Indeks utworu lub wpisu do którego przewinąć.',
		ro:
			'Indexul melodiei sau al înregistrării până la care să fie sărit peste.',
	},
	type: ApplicationCommandOptionTypes.Integer,
};

export { by, byTimestamp, collection, index, query, to, toTimestamp };
