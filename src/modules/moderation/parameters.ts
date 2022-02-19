import { Option, OptionType } from '../../commands/option.ts';

const duration: Option = {
	name: 'duration',
	description: 'The duration of the sanction.',
	required: true,
	type: OptionType.STRING,
};

const reason: Option = {
	name: 'reason',
	description: 'The reason for the sanction or its repeal.',
	required: true,
	type: OptionType.STRING,
};

export { duration, reason };
