import { Client } from "logos/client";

type InteractionHandler = (
	client: Client,
	interaction: Logos.Interaction,
	localeData: Logos.InteractionLocaleData,
) => Promise<void>;
interface OptionFlags {
	readonly hasRateLimit?: boolean;
	readonly isShowable?: boolean;
}
interface OptionMetadata {
	readonly identifier: string;
	readonly handle?: InteractionHandler;
	readonly handleAutocomplete?: InteractionHandler;
	readonly flags?: OptionFlags;
}

type Command = Discord.CreateApplicationCommand;
type Option = Discord.ApplicationCommandOption;

interface CommandTemplate extends OptionMetadata {
	readonly type: Discord.ApplicationCommandTypes;
	readonly defaultMemberPermissions: Discord.PermissionStrings[];
	readonly options?: OptionTemplate[];
}

interface OptionTemplate extends OptionMetadata {
	readonly type: Discord.ApplicationCommandOptionTypes;
	readonly required?: boolean;
	readonly choices?: Discord.ApplicationCommandOptionChoice[];
	readonly channelTypes?: Discord.ChannelTypes[];
	readonly minValue?: number;
	readonly maxValue?: number;
	readonly minLength?: number;
	readonly maxLength?: number;
	readonly autocomplete?: boolean;
	readonly options?: OptionTemplate[];
}

export type { Command, CommandTemplate, OptionMetadata, InteractionHandler, Option, OptionTemplate };
