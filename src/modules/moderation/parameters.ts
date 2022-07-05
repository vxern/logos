import { ApplicationCommandOptionType } from '../../../deps.ts';
import { Option } from '../../commands/structs/option.ts';

const duration: Option = {
	name: 'duration',
	description: 'The duration of the sanction.',
	required: true,
	type: ApplicationCommandOptionType.STRING,
};

const reason: Option = {
	name: 'reason',
	description:
		'The reason for the sanction or its repeal. It should be descriptive.',
	required: true,
	type: ApplicationCommandOptionType.STRING,
};

export { duration, reason };
