import {
	_,
	ApplicationCommandOptionBase,
	ApplicationCommandOptionType as OptionType,
} from '../../deps.ts';
import { InteractionHandler } from '../client.ts';
import { Optional } from '../utils.ts';

/** A command option with an optional handler for its execution. */
interface Option
	extends Optional<ApplicationCommandOptionBase<Option>, 'description'> {
	/** The function to be executed when this command option is selected. */
	handle?: InteractionHandler;
}

export { OptionType };
export type { Option };
