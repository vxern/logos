import { ApplicationCommandOption, Bot, CreateSlashApplicationCommand, Interaction } from 'discordeno';
import { Client } from 'logos/src/mod.ts';

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

export type { Command, CommandBuilder, InteractionHandler, OptionBuilder };
