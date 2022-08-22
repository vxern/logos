import { ApplicationCommandOptionTypes } from '../../../deps.ts';
import { OptionBuilder } from '../../commands/command.ts';

const duration: OptionBuilder = {
	name: 'duration',
	nameLocalizations: {
		pl: 'okres',
		ro: 'durată',
	},
	description: 'The duration of the sanction.',
	descriptionLocalizations: {
		pl: 'Jak długo sankcja ma trwać.',
		ro: 'Durata sancțiunii.',
	},
	type: ApplicationCommandOptionTypes.String,
	required: true,
	autocomplete: true,
};

const reason: OptionBuilder = {
	name: 'reason',
	nameLocalizations: {
		pl: 'powód',
		ro: 'motiv',
	},
	description:
		'The reason for the sanction or its repeal. It should be descriptive.',
	descriptionLocalizations: {
		pl: 'Powód sankcji lub jej uchylenia. Powinien być szczegółowy.',
		ro:
			'Motivul pentru sancțiune sau anularea acesteia. Ar trebui să fie detaliat.',
	},
	type: ApplicationCommandOptionTypes.String,
	required: true,
};

export { duration, reason };
