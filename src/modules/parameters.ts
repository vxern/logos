import { Option, OptionType } from '../commands/option.ts';

const elements: Option = {
	name: 'number',
	description: 'The number of elements to manage.',
	required: true,
	type: OptionType.INTEGER,
};

const index: Option = {
	name: 'index',
	description: 'The index of the element.',
	required: true,
	type: OptionType.INTEGER,
};

const user: Option = {
	name: 'user',
	description: 'The user\'s name, tag, ID or mention.',
	required: true,
	type: OptionType.STRING,
};

export { elements, index, user };
