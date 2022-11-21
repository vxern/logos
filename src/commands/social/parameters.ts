import { ApplicationCommandOptionTypes } from 'discordeno';
import { createLocalisations, Parameters } from 'logos/assets/localisations/mod.ts';
import { OptionBuilder } from 'logos/src/commands/mod.ts';

const role: OptionBuilder = {
	...createLocalisations(Parameters.social.roles),
	type: ApplicationCommandOptionTypes.Role,
	required: true,
};

export { role };
