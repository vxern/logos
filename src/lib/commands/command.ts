import * as Logos from "../../types";
import { Client } from "../client";
import * as Discord from "discordeno";

type WithRequired<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> & Required<Pick<T, K>>;

/** Describes the handler of an interaction. */
type InteractionHandler = ([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction) => Promise<void>;

type Command = Discord.CreateSlashApplicationCommand;

type Option = Discord.ApplicationCommandOption;

interface CommandFeatures {
	isRateLimited?: boolean;
	handle?: InteractionHandler;
	handleAutocomplete?: InteractionHandler;
	options?: OptionTemplate[];
}

type LocalisationProperties = "name" | "nameLocalizations" | "description" | "descriptionLocalizations";

type CommandTemplate = WithRequired<
	Omit<Command, "options" | Exclude<LocalisationProperties, "name">>,
	"defaultMemberPermissions" | "type"
> &
	CommandFeatures;

type OptionTemplate = Omit<Option, "options" | Exclude<LocalisationProperties, "name">> & CommandFeatures;

export type { Command, CommandTemplate, InteractionHandler, LocalisationProperties, Option, OptionTemplate };
