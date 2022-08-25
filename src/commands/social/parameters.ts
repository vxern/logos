import { ApplicationCommandOptionTypes } from '../../../deps.ts';
import { OptionBuilder } from '../../commands/command.ts';

const role: OptionBuilder = {
	name: 'role',
	nameLocalizations: {
		pl: 'rola',
		ro: 'rol',
	},
	description: 'The name of the role.',
	descriptionLocalizations: {
		pl: 'Nazwa roli.',
		ro: 'Numele rolului.',
	},
	type: ApplicationCommandOptionTypes.Role,
	required: true,
};

export { role };
