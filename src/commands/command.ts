import { ApplicationCommandOption, Bot, CreateSlashApplicationCommand, Interaction } from 'discordeno';
import { Client } from 'logos/src/client.ts';

type WithRequired<T, K extends keyof T> =
	& Pick<T, Exclude<keyof T, K>>
	& Required<Pick<T, K>>;

/** Describes the handler of an interaction. */
type InteractionHandler = ([client, bot]: [Client, Bot], interaction: Interaction) => void | Promise<void>;

type Command = CreateSlashApplicationCommand;

type Option = ApplicationCommandOption;

interface CommandFeatures {
	isRateLimited?: boolean;
	handle?: InteractionHandler;
	handleAutocomplete?: InteractionHandler;
	options?: OptionTemplate[];
}

type LocalisationProperties = 'nameLocalizations' | 'description' | 'descriptionLocalizations';

type CommandTemplate =
	& WithRequired<Omit<Command, 'options' | LocalisationProperties>, 'defaultMemberPermissions' | 'type'>
	& CommandFeatures;

type OptionTemplate = Omit<Option, 'options' | LocalisationProperties> & CommandFeatures;

export type { Command, CommandTemplate, InteractionHandler, LocalisationProperties, Option, OptionTemplate };
