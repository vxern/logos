import {
	ApplicationCommandOption,
	CreateApplicationCommand,
	Interaction,
} from '../../deps.ts';
import { Client } from '../client.ts';
import {
	ApplicationCommandFlags,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../deps.ts';
import { Language } from '../types.ts';

type WithRequired<T, K extends keyof T> =
	& Pick<T, Exclude<keyof T, K>>
	& Required<Pick<T, K>>;

/**
 * The properties of commands and options that --, for the purposes of this bot, --
 * should be required to be present.
 */
type LocalisationFields = 'nameLocalizations' | 'descriptionLocalizations';

/** Describes the handler of an interaction. */
type InteractionHandler = (
	client: Client,
	interaction: Interaction,
) => void | Promise<void>;

type CommandLocalised = WithRequired<
	CreateApplicationCommand,
	LocalisationFields
>;

type OptionLocalised = WithRequired<
	ApplicationCommandOption,
	LocalisationFields
>;

type Command =
	& WithRequired<Omit<CommandLocalised, 'options'>, 'defaultMemberPermissions'>
	& {
		handle?: InteractionHandler;
		options?: Option[];
	};

type Option = Omit<OptionLocalised, 'options'> & {
	handle?: InteractionHandler;
	options?: Option[];
};

type CommandLocaliser = (language: Language) => Command;

type CommandBuilder = Command | CommandLocaliser;

type OptionBuilder = Option;

/**
 * A handler for interactions that are missing a handler.
 *
 * @param interaction - The interaction to be handled.
 */
function displayUnimplemented(
	client: Client,
	interaction: Interaction,
): Promise<unknown> {
	return sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: 'Unimplemented',
					description: 'This command is missing a handler.',
				}],
			},
		},
	);
}

export type {
	Command,
	CommandBuilder,
	displayUnimplemented,
	InteractionHandler,
	OptionBuilder,
};
