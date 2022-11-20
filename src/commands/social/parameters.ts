import { ApplicationCommandOptionTypes } from 'discordeno';
import { createLocalisations, Parameters } from '../../../assets/localisations/mod.ts';
import { OptionBuilder } from '../../commands/command.ts';

const role: OptionBuilder = {
	...createLocalisations(Parameters.social.roles),
	type: ApplicationCommandOptionTypes.Role,
	required: true,
};

export { role };
