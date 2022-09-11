import {
	ApplicationCommandOption,
	Bot,
	CreateSlashApplicationCommand,
	Interaction,
} from '../../deps.ts';
import { Client } from '../client.ts';
import {
	ApplicationCommandFlags,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../deps.ts';

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
	[client, bot]: [Client, Bot],
	interaction: Interaction,
) => void | Promise<void>;

type CommandLocalised = WithRequired<
	CreateSlashApplicationCommand,
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

type CommandBuilder = Command;

type OptionBuilder = Option;

/**
 * A handler for interactions that are missing a handler.
 *
 * @param interaction - The interaction to be handled.
 */
function displayUnimplemented(
	[_client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<unknown> {
	return sendInteractionResponse(
		bot,
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
