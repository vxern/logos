import { ApplicationCommandOptionTypes } from 'discordeno';
import { Parameters } from '../../../assets/localisations/parameters.ts';
import { createLocalisations } from '../../../assets/localisations/types.ts';
import { OptionBuilder } from '../../commands/command.ts';

const role: OptionBuilder = {
	...createLocalisations(Parameters.social.roles),
	type: ApplicationCommandOptionTypes.Role,
	required: true,
};

export { role };
