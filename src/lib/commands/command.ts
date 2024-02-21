import * as Discord from "@discordeno/bot";
import * as Logos from "../../types";
import { Client } from "../client";

// TODO(vxern): This whole file could be improved.

type WithRequired<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> & Required<Pick<T, K>>;

/** Describes the handler of an interaction. */
type InteractionHandler = (client: Client, interaction: Logos.Interaction<any, any>) => Promise<void>;

type Command = Discord.CreateApplicationCommand;

type Option = Discord.ApplicationCommandOption;

interface CommandOptionFlags {
	hasRateLimit?: boolean;
	isShowable?: boolean;
}

interface CommandMetadata {
	id: string;
	handle?: InteractionHandler;
	handleAutocomplete?: InteractionHandler;
	flags?: CommandOptionFlags;
}

type LocalisationProperties = "name" | "nameLocalizations" | "description" | "descriptionLocalizations";

// TODO(vxern): Rename to builder.
type CommandTemplate = WithRequired<
	Omit<Command, "options" | LocalisationProperties>,
	"defaultMemberPermissions" | "type"
> & {
	options?: OptionTemplate[];
} & CommandMetadata;

type OptionTemplate = Omit<Option, "options" | LocalisationProperties> & {
	options?: OptionTemplate[];
} & CommandMetadata;

export type {
	Command,
	CommandTemplate,
	CommandMetadata,
	InteractionHandler,
	LocalisationProperties,
	Option,
	OptionTemplate,
};
