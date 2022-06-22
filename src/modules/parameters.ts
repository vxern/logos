import { ApplicationCommandOptionType } from "../../deps.ts";
import { Option } from '../commands/structs/option.ts';

const elements: Option = {
	name: 'number',
	description: 'The number of elements to manage.',
	required: true,
	type: ApplicationCommandOptionType.INTEGER,
};

const index: Option = {
	name: 'index',
	description: 'The index of the element.',
	required: true,
	type: ApplicationCommandOptionType.INTEGER,
};

const user: Option = {
	name: 'user',
	description: 'The user\'s name, tag, ID or mention.',
	required: true,
	type: ApplicationCommandOptionType.STRING,
};

export { elements, index, user };
