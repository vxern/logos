import {
	ApplicationCommandInteraction,
	ApplicationCommandPartialBase,
	AutocompleteInteraction,
} from '../../../deps.ts';
import { Client } from '../../client.ts';
import { Availability } from './availability.ts';
import { Option } from './option.ts';

/**
 * Describes the handler of an interaction.
 *
 * @param client - The client handling this interaction.
 * @param interaction - The interaction to be handled.
 */
type InteractionHandler = (
	client: Client,
	interaction: ApplicationCommandInteraction | AutocompleteInteraction,
) => unknown;

/** An application command with an optional handler for its execution. */
interface Command extends ApplicationCommandPartialBase<Option> {
	/** Defines the group of users to whom the command is available. */
	availability: Availability;

	/** The function to be executed when this command is selected. */
	handle?: InteractionHandler;
}

export type { Command, InteractionHandler };
