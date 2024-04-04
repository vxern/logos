import type { Client } from "logos/client";
import { handleDisplayAcknowledgements } from "logos/commands/handlers/acknowledgements";
import { handleStartAnswering } from "logos/commands/handlers/answer";
import { handleDisplayCefrGuide } from "logos/commands/handlers/cefr";
import { handleStartCorrecting } from "logos/commands/handlers/correction";
import { handleDisplayCredits } from "logos/commands/handlers/credits";
import { handleStartGame } from "logos/commands/handlers/game";
import { InteractionHandler } from "logos/commands/handlers/handler";
import { handleDisplayBotInformation } from "logos/commands/handlers/information/bot";
import { handleDisplayGuildInformation } from "logos/commands/handlers/information/guild";
import {
	handleDisplayDictionaryLicence,
	handleDisplayDictionaryLicenceAutocomplete,
} from "logos/commands/handlers/licence/dictionary";
import {
	handleDisplaySoftwareLicence,
	handleDisplaySoftwareLicenceAutocomplete,
} from "logos/commands/handlers/licence/software";
import {
	handleDisplayPraisesByAuthor,
	handleDisplayPraisesByAuthorAutocomplete,
} from "logos/commands/handlers/list/praises/author";
import {
	handleDisplayPraisesByTarget,
	handleDisplayPraisesByTargetAutocomplete,
} from "logos/commands/handlers/list/praises/target";
import { handleDisplayWarnings, handleDisplayWarningsAutocomplete } from "logos/commands/handlers/list/warnings";
import { handleFastForward, handleFastForwardAutocomplete } from "logos/commands/handlers/music/fast-forward";
import { handleDisplayPlaybackHistory } from "logos/commands/handlers/music/history";
import { handleLoopPlayback } from "logos/commands/handlers/music/loop";
import { handleDisplayCurrentlyPlaying } from "logos/commands/handlers/music/now";
import { handlePausePlayback } from "logos/commands/handlers/music/pause";
import { handleRequestStreamPlayback } from "logos/commands/handlers/music/play/file";
import { handleRequestYouTubePlayback } from "logos/commands/handlers/music/play/query";
import { handleDisplayPlaybackQueue } from "logos/commands/handlers/music/queue";
import { handleRemoveSongListing } from "logos/commands/handlers/music/remove";
import { handleReplayAction } from "logos/commands/handlers/music/replay";
import { handleResumePlayback } from "logos/commands/handlers/music/resume";
import { handleRewind, handleRewindAutocomplete } from "logos/commands/handlers/music/rewind";
import { handleSkipAction } from "logos/commands/handlers/music/skip";
import { handleSkipToTimestamp, handleSkipToTimestampAutocomplete } from "logos/commands/handlers/music/skip-to";
import { handleStopPlayback } from "logos/commands/handlers/music/stop";
import { handleUnskipAction } from "logos/commands/handlers/music/unskip";
import { handleDisplayVolume } from "logos/commands/handlers/music/volume/display";
import { handleSetVolume } from "logos/commands/handlers/music/volume/set";
import { handlePardonUser, handlePardonUserAutocomplete } from "logos/commands/handlers/pardon";
import { handleDisplayModerationPolicy } from "logos/commands/handlers/policy";
import { handlePraiseUser, handlePraiseUserAutocomplete } from "logos/commands/handlers/praise";
import { handleOpenRoleSelectionMenu } from "logos/commands/handlers/profile/roles";
import { handleDisplayProfile, handleDisplayProfileAutocomplete } from "logos/commands/handlers/profile/view";
import { handlePurgeMessages, handlePurgeMessagesAutocomplete } from "logos/commands/handlers/purge";
import { handleRecogniseLanguageChatInput, handleRecogniseLanguageMessage } from "logos/commands/handlers/recognise";
import { handleMakeReport } from "logos/commands/handlers/report";
import { handleSubmitResource } from "logos/commands/handlers/resource";
import { handleDisplayResources } from "logos/commands/handlers/resources";
import { handleCiteRule, handleCiteRuleAutocomplete } from "logos/commands/handlers/rule";
import { handleClearLanguage } from "logos/commands/handlers/settings/language/clear";
import { handleSetLanguage, handleSetLanguageAutocomplete } from "logos/commands/handlers/settings/language/set";
import { handleDisplaySettings } from "logos/commands/handlers/settings/view";
import { handleToggleSlowmode, handleToggleSlowmodeAutocomplete } from "logos/commands/handlers/slowmode";
import { handleMakeSuggestion } from "logos/commands/handlers/suggestion";
import { handleOpenTicket } from "logos/commands/handlers/ticket/open";
import { handleClearTimeout, handleClearTimeoutAutocomplete } from "logos/commands/handlers/timeout/clear";
import { handleSetTimeout, handleSetTimeoutAutocomplete } from "logos/commands/handlers/timeout/set";
import {
	handleTranslateChatInput,
	handleTranslateChatInputAutocomplete,
	handleTranslateMessage,
} from "logos/commands/handlers/translate";
import { handleWarnUser, handleWarnUserAutocomplete } from "logos/commands/handlers/warn";

// TODO(vxern): Make options named so as to allow referencing specific subcommands.
/**
 * @privateRemarks
 * Commands, command groups and options are ordered alphabetically.
 */
const commands = Object.freeze({
	// Information
	information: {
		identifier: "information",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				identifier: "bot",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayBotInformation,
			},
			{
				identifier: "server",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayGuildInformation,
			},
		],
	},
	list: {
		identifier: "list",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				identifier: "praises",
				type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
				options: [
					{
						identifier: "author",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleDisplayPraisesByAuthor,
						handleAutocomplete: handleDisplayPraisesByAuthorAutocomplete,
						options: [{ ...constants.parameters.user, required: false }],
					},
					{
						identifier: "target",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleDisplayPraisesByTarget,
						handleAutocomplete: handleDisplayPraisesByTargetAutocomplete,
						options: [{ ...constants.parameters.user, required: false }],
					},
				],
			},
			{
				identifier: "warnings",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayWarnings,
				handleAutocomplete: handleDisplayWarningsAutocomplete,
				options: [{ ...constants.parameters.user, required: false }],
			},
		],
	},
	// Language
	answerMessage: {
		identifier: "answer.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleStartAnswering,
	},
	cefr: {
		identifier: "cefr",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleDisplayCefrGuide,
		options: [constants.parameters.show],
		flags: {
			isShowable: true,
		},
	},
	correctionPartialMessage: {
		identifier: "correction.options.partial.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: (client: Client, interaction: Logos.Interaction) =>
			handleStartCorrecting(client, interaction, { mode: "partial" }),
	},
	correctionFullMessage: {
		identifier: "correction.options.full.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: (client: Client, interaction: Logos.Interaction) =>
			handleStartCorrecting(client, interaction, { mode: "full" }),
	},
	game: {
		identifier: "game",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleStartGame,
	},
	recognise: {
		identifier: "recognize",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleRecogniseLanguageChatInput,
		options: [
			{
				identifier: "text",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
			},
		],
	},
	recogniseMessage: {
		identifier: "recognize.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleRecogniseLanguageMessage,
	},
	resources: {
		identifier: "resources",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleDisplayResources,
		options: [constants.parameters.show],
		flags: {
			isShowable: true,
		},
	},
	translate: {
		identifier: "translate",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleTranslateChatInput,
		handleAutocomplete: handleTranslateChatInputAutocomplete,
		options: [
			{
				identifier: "text",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
			},
			{
				identifier: "to",
				type: Discord.ApplicationCommandOptionTypes.String,
				autocomplete: true,
			},
			{
				identifier: "from",
				type: Discord.ApplicationCommandOptionTypes.String,
				autocomplete: true,
			},
			constants.parameters.show,
		],
		flags: {
			hasRateLimit: true,
			isShowable: true,
		},
	},
	translateMessage: {
		identifier: "translate.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleTranslateMessage,
		flags: {
			isShowable: true,
		},
	},
	// Meta
	acknowledgements: {
		identifier: "acknowledgements",
		type: Discord.ApplicationCommandTypes.ChatInput,
		handle: handleDisplayAcknowledgements,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
	},
	credits: {
		identifier: "credits",
		type: Discord.ApplicationCommandTypes.ChatInput,
		handle: handleDisplayCredits,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
	},
	licence: {
		identifier: "license",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				identifier: "dictionary",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayDictionaryLicence,
				handleAutocomplete: handleDisplayDictionaryLicenceAutocomplete,
				options: [
					{
						identifier: "dictionary",
						type: Discord.ApplicationCommandOptionTypes.String,
						required: true,
						autocomplete: true,
					},
				],
			},
			{
				identifier: "software",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplaySoftwareLicence,
				handleAutocomplete: handleDisplaySoftwareLicenceAutocomplete,
				options: [
					{
						identifier: "package",
						type: Discord.ApplicationCommandOptionTypes.String,
						required: true,
						autocomplete: true,
					},
				],
			},
		],
	},
	settings: {
		identifier: "settings",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				identifier: "language",
				type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
				options: [
					{
						identifier: "clear",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleClearLanguage,
					},
					{
						identifier: "set",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleSetLanguage,
						handleAutocomplete: handleSetLanguageAutocomplete,
						options: [
							{
								identifier: "language",
								type: Discord.ApplicationCommandOptionTypes.String,
								required: true,
								autocomplete: true,
							},
						],
					},
				],
			},
			{
				identifier: "view",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplaySettings,
			},
		],
	},
	// Moderation
	pardon: {
		identifier: "pardon",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handlePardonUser,
		handleAutocomplete: handlePardonUserAutocomplete,
		options: [
			constants.parameters.user,
			{
				identifier: "warning",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
				autocomplete: true,
			},
		],
	},
	policy: {
		identifier: "policy",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleDisplayModerationPolicy,
		options: [constants.parameters.show],
		flags: {
			isShowable: true,
		},
	},
	purge: {
		identifier: "purge",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handlePurgeMessages,
		handleAutocomplete: handlePurgeMessagesAutocomplete,
		options: [
			{
				identifier: "start",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
			},
			{
				identifier: "end",
				type: Discord.ApplicationCommandOptionTypes.String,
			},
			{ ...constants.parameters.user, identifier: "author", required: false },
		],
	},
	report: {
		identifier: "report",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleMakeReport,
	},
	rule: {
		identifier: "rule",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleCiteRule,
		handleAutocomplete: handleCiteRuleAutocomplete,
		options: [
			{
				identifier: "rule",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
				autocomplete: true,
			},
			constants.parameters.show,
		],
		flags: {
			isShowable: true,
		},
	},
	slowmode: {
		identifier: "slowmode",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handleToggleSlowmode,
		handleAutocomplete: handleToggleSlowmodeAutocomplete,
		options: [
			{
				identifier: "level",
				type: Discord.ApplicationCommandOptionTypes.String,
				autocomplete: true,
			},
		],
	},
	timeout: {
		identifier: "timeout",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		options: [
			{
				identifier: "set",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleSetTimeout,
				handleAutocomplete: handleSetTimeoutAutocomplete,
				options: [constants.parameters.user, constants.parameters.duration, constants.parameters.reason],
			},
			{
				identifier: "clear",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleClearTimeout,
				handleAutocomplete: handleClearTimeoutAutocomplete,
				options: [constants.parameters.user],
			},
		],
	},
	warn: {
		identifier: "warn",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handleWarnUser,
		handleAutocomplete: handleWarnUserAutocomplete,
		options: [
			constants.parameters.user,
			{
				identifier: "rule",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
				autocomplete: true,
			},
			constants.parameters.reason,
		],
	},
	//Server
	resource: {
		identifier: "resource",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleSubmitResource,
	},
	suggestion: {
		identifier: "suggestion",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleMakeSuggestion,
	},
	ticket: {
		identifier: "ticket",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				identifier: "open",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleOpenTicket,
			},
		],
	},
	// Social
	music: {
		identifier: "music",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				identifier: "fast-forward",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleFastForward,
				handleAutocomplete: handleFastForwardAutocomplete,
				options: [constants.parameters.timestamp],
			},
			{
				identifier: "history",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayPlaybackHistory,
				options: [constants.parameters.show],
				flags: {
					isShowable: true,
				},
			},
			{
				identifier: "loop",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleLoopPlayback,
				options: [constants.parameters.collection],
			},
			{
				identifier: "now",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayCurrentlyPlaying,
				options: [constants.parameters.collection, constants.parameters.show],
				flags: {
					isShowable: true,
				},
			},
			{
				identifier: "pause",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handlePausePlayback,
			},
			{
				identifier: "play",
				type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
				options: [
					{
						identifier: "stream",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleRequestStreamPlayback,
						options: [
							{
								identifier: "url",
								type: Discord.ApplicationCommandOptionTypes.String,
								required: true,
							},
						],
					},
					{
						identifier: "youtube",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleRequestYouTubePlayback,
						options: [constants.parameters.query],
					},
				],
			},
			{
				identifier: "queue",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayPlaybackQueue,
				options: [constants.parameters.show],
				flags: {
					isShowable: true,
				},
			},
			{
				identifier: "remove",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleRemoveSongListing,
			},
			{
				identifier: "replay",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleReplayAction,
				options: [constants.parameters.collection],
			},
			{
				identifier: "resume",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleResumePlayback,
			},
			{
				identifier: "rewind",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleRewind,
				handleAutocomplete: handleRewindAutocomplete,
				options: [constants.parameters.timestamp],
			},
			{
				identifier: "skip-to",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleSkipToTimestamp,
				handleAutocomplete: handleSkipToTimestampAutocomplete,
				options: [constants.parameters.timestamp],
			},
			{
				identifier: "skip",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleSkipAction,
				options: [constants.parameters.collection, constants.parameters.by, constants.parameters.to],
			},
			{
				identifier: "stop",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleStopPlayback,
			},
			{
				identifier: "unskip",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleUnskipAction,
				options: [constants.parameters.collection, constants.parameters.by, constants.parameters.to],
			},
			{
				identifier: "volume",
				type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
				options: [
					{
						identifier: "display",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleDisplayVolume,
						options: [constants.parameters.show],
						flags: {
							isShowable: true,
						},
					},
					{
						identifier: "set",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleSetVolume,
						options: [
							{
								identifier: "volume",
								type: Discord.ApplicationCommandOptionTypes.Integer,
								required: true,
							},
						],
					},
				],
			},
		],
	},
	praise: {
		identifier: "praise",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handlePraiseUser,
		handleAutocomplete: handlePraiseUserAutocomplete,
		options: [
			constants.parameters.user,
			{
				identifier: "comment",
				type: Discord.ApplicationCommandOptionTypes.String,
			},
		],
	},
	profile: {
		identifier: "profile",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				identifier: "view",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayProfile,
				handleAutocomplete: handleDisplayProfileAutocomplete,
				options: [{ ...constants.parameters.user, required: false }, constants.parameters.show],
				flags: {
					isShowable: true,
				},
			},
			{
				identifier: "roles",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleOpenRoleSelectionMenu,
			},
		],
	},
} satisfies Record<string, CommandTemplate>);
type CommandName = keyof typeof commands;

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

export default commands;
export type { Command, CommandName, CommandTemplate, OptionMetadata, Option, OptionTemplate };
