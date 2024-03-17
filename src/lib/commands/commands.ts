import type { Client } from "../client";
import { CommandTemplate } from "./command";
import { handleDisplayBotInformation } from "./information/commands/information/bot";
import { handleDisplayGuildInformation } from "./information/commands/information/guild";
import {
	handleDisplayPraisesByAuthor,
	handleDisplayPraisesByAuthorAutocomplete,
} from "./information/commands/list/praises/author";
import {
	handleDisplayPraisesByTarget,
	handleDisplayPraisesByTargetAutocomplete,
} from "./information/commands/list/praises/target";
import { handleDisplayWarnings, handleDisplayWarningsAutocomplete } from "./information/commands/list/warnings";
import { handleStartAnswering } from "./language/commands/answer";
import { handleDisplayCefrGuide } from "./language/commands/cefr";
import { handleStartCorrecting } from "./language/commands/correction";
import { handleStartGame } from "./language/commands/game";
import { handleRecogniseLanguageChatInput, handleRecogniseLanguageMessage } from "./language/commands/recognise";
import { handleDisplayResources } from "./language/commands/resources";
import {
	handleTranslateChatInput,
	handleTranslateChatInputAutocomplete,
	handleTranslateMessage,
} from "./language/commands/translate";
import { handleDisplayAcknowledgements } from "./meta/commands/acknowledgements";
import { handleDisplayCredits } from "./meta/commands/credits";
import {
	handleDisplayDictionaryLicence,
	handleDisplayDictionaryLicenceAutocomplete,
} from "./meta/commands/licence/dictionary";
import {
	handleDisplaySoftwareLicence,
	handleDisplaySoftwareLicenceAutocomplete,
} from "./meta/commands/licence/software";
import language from "./meta/commands/settings/language";
import view from "./meta/commands/settings/view";
import { handlePardonUser, handlePardonUserAutocomplete } from "./moderation/commands/pardon";
import { handleDisplayModerationPolicy } from "./moderation/commands/policy";
import { handlePurgeMessages, handlePurgeMessagesAutocomplete } from "./moderation/commands/purge";
import { handleMakeReport } from "./moderation/commands/report";
import { handleCiteRule, handleCiteRuleAutocomplete } from "./moderation/commands/rule";
import { handleToggleSlowmode, handleToggleSlowmodeAutocomplete } from "./moderation/commands/slowmode";
import { handleClearTimeout, handleClearTimeoutAutocomplete } from "./moderation/commands/timeout/clear";
import { handleSetTimeout, handleSetTimeoutAutocomplete } from "./moderation/commands/timeout/set";
import { handleWarnUser, handleWarnUserAutocomplete } from "./moderation/commands/warn";
import { handleFastForward, handleFastForwardAutocomplete } from "./music/commands/fast-forward";
import { handleDisplayPlaybackHistory } from "./music/commands/history";
import { handleLoopPlayback } from "./music/commands/loop";
import { handleDisplayCurrentlyPlaying } from "./music/commands/now";
import { handlePausePlayback } from "./music/commands/pause";
import { handleRequestFilePlayback } from "./music/commands/play/file";
import { handleRequestQueryPlayback } from "./music/commands/play/query";
import { handleDisplayPlaybackQueue } from "./music/commands/queue";
import { handleRemoveSongListing } from "./music/commands/remove";
import { handleReplayAction } from "./music/commands/replay";
import { handleResumePlayback } from "./music/commands/resume";
import { handleRewind, handleRewindAutocomplete } from "./music/commands/rewind";
import { handleSkipAction } from "./music/commands/skip";
import { handleSkipToTimestamp, handleSkipToTimestampAutocomplete } from "./music/commands/skip-to";
import { handleStopPlayback } from "./music/commands/stop";
import { handleUnskipAction } from "./music/commands/unskip";
import { handleDisplayVolume } from "./music/commands/volume/display";
import { handleSetVolume } from "./music/commands/volume/set";
import { sources } from "./music/data/sources/sources";
import { by, collection, duration, query, reason, show, timestamp, to, user } from "./parameters";
import { handleSubmitResource } from "./server/commands/resource";
import { handleMakeSuggestion } from "./server/commands/suggestion";
import { handleOpenTicket } from "./server/commands/ticket/open";
import { handlePraiseUser, handlePraiseUserAutocomplete } from "./social/commands/praise";
import { handleOpenRoleSelectionMenu } from "./social/commands/profile/roles";
import { handleDisplayProfile, handleDisplayProfileAutocomplete } from "./social/commands/profile/view";

// TODO(vxern): Type out all the identifiers explicitly.
// TODO(vxern): Make options named so as to allow referencing specific subcommands.
/**
 * @privateRemarks
 * Commands, command groups and options are ordered alphabetically.
 */
export default Object.freeze({
	// Information
	information: {
		id: "information",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				id: "bot",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayBotInformation,
			},
			{
				id: "server",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayGuildInformation,
			},
		],
	},
	list: {
		id: "list",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				id: "praises",
				type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
				options: [
					{
						id: "author",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleDisplayPraisesByAuthor,
						handleAutocomplete: handleDisplayPraisesByAuthorAutocomplete,
						options: [{ ...user, required: false }],
					},
					{
						id: "target",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleDisplayPraisesByTarget,
						handleAutocomplete: handleDisplayPraisesByTargetAutocomplete,
						options: [{ ...user, required: false }],
					},
				],
			},
			{
				id: "warnings",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayWarnings,
				handleAutocomplete: handleDisplayWarningsAutocomplete,
				options: [{ ...user, required: false }],
			},
		],
	},
	// Language
	answerMessage: {
		id: "answer.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleStartAnswering,
	},
	cefr: {
		id: "cefr",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleDisplayCefrGuide,
		options: [show],
		flags: {
			isShowable: true,
		},
	},
	correctionPartialMessage: {
		id: "correction.options.partial.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: (client: Client, interaction: Logos.Interaction) => handleStartCorrecting(client, interaction, "partial"),
	},
	correctionFullMessage: {
		id: "correction.options.full.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: (client: Client, interaction: Logos.Interaction) => handleStartCorrecting(client, interaction, "full"),
	},
	game: {
		id: "game",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleStartGame,
	},
	recognise: {
		id: "recognize",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleRecogniseLanguageChatInput,
		options: [
			{
				id: "text",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
			},
		],
	},
	recogniseMessage: {
		id: "recognize.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleRecogniseLanguageMessage,
	},
	resources: {
		id: "resources",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleDisplayResources,
		options: [show],
		flags: {
			isShowable: true,
		},
	},
	translate: {
		id: "translate",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleTranslateChatInput,
		handleAutocomplete: handleTranslateChatInputAutocomplete,
		options: [
			{
				id: "text",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
			},
			{
				id: "to",
				type: Discord.ApplicationCommandOptionTypes.String,
				autocomplete: true,
			},
			{
				id: "from",
				type: Discord.ApplicationCommandOptionTypes.String,
				autocomplete: true,
			},
			show,
		],
		flags: {
			hasRateLimit: true,
			isShowable: true,
		},
	},
	translateMessage: {
		id: "translate.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleTranslateMessage,
		flags: {
			isShowable: true,
		},
	},
	// Meta
	acknowledgements: {
		id: "acknowledgements",
		type: Discord.ApplicationCommandTypes.ChatInput,
		handle: handleDisplayAcknowledgements,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
	},
	credits: {
		id: "credits",
		type: Discord.ApplicationCommandTypes.ChatInput,
		handle: handleDisplayCredits,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
	},
	licence: {
		id: "license",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				id: "dictionary",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayDictionaryLicence,
				handleAutocomplete: handleDisplayDictionaryLicenceAutocomplete,
				options: [
					{
						id: "dictionary",
						type: Discord.ApplicationCommandOptionTypes.String,
						required: true,
						autocomplete: true,
					},
				],
			},
			{
				id: "software",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplaySoftwareLicence,
				handleAutocomplete: handleDisplaySoftwareLicenceAutocomplete,
				options: [
					{
						id: "package",
						type: Discord.ApplicationCommandOptionTypes.String,
						required: true,
						autocomplete: true,
					},
				],
			},
		],
	},
	settings: {
		id: "settings",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [language, view],
	},
	// Moderation
	pardon: {
		id: "pardon",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handlePardonUser,
		handleAutocomplete: handlePardonUserAutocomplete,
		options: [
			user,
			{
				id: "warning",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
				autocomplete: true,
			},
		],
	},
	policy: {
		id: "policy",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleDisplayModerationPolicy,
		options: [show],
		flags: {
			isShowable: true,
		},
	},
	purge: {
		id: "purge",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handlePurgeMessages,
		handleAutocomplete: handlePurgeMessagesAutocomplete,
		options: [
			{
				id: "start",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
			},
			{
				id: "end",
				type: Discord.ApplicationCommandOptionTypes.String,
			},
			{ ...user, id: "author", required: false },
		],
	},
	report: {
		id: "report",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleMakeReport,
	},
	rule: {
		id: "rule",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleCiteRule,
		handleAutocomplete: handleCiteRuleAutocomplete,
		options: [
			{
				id: "rule",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
				autocomplete: true,
			},
			show,
		],
		flags: {
			isShowable: true,
		},
	},
	slowmode: {
		id: "slowmode",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handleToggleSlowmode,
		handleAutocomplete: handleToggleSlowmodeAutocomplete,
		options: [
			{
				id: "level",
				type: Discord.ApplicationCommandOptionTypes.String,
				autocomplete: true,
			},
		],
	},
	timeout: {
		id: "timeout",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		options: [
			{
				id: "set",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleSetTimeout,
				handleAutocomplete: handleSetTimeoutAutocomplete,
				options: [user, duration, reason],
			},
			{
				id: "clear",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleClearTimeout,
				handleAutocomplete: handleClearTimeoutAutocomplete,
				options: [user],
			},
		],
	},
	warn: {
		id: "warn",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handleWarnUser,
		handleAutocomplete: handleWarnUserAutocomplete,
		options: [
			user,
			{
				id: "rule",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
				autocomplete: true,
			},
			reason,
		],
	},
	//Server
	resource: {
		id: "resource",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleSubmitResource,
	},
	suggestion: {
		id: "suggestion",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleMakeSuggestion,
	},
	ticket: {
		id: "ticket",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				id: "open",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleOpenTicket,
			},
		],
	},
	// Social
	music: {
		id: "music",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				id: "fast-forward",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleFastForward,
				handleAutocomplete: handleFastForwardAutocomplete,
				options: [timestamp],
			},
			{
				id: "history",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayPlaybackHistory,
				options: [show],
				flags: {
					isShowable: true,
				},
			},
			{
				id: "loop",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleLoopPlayback,
				options: [collection],
			},
			{
				id: "now",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayCurrentlyPlaying,
				options: [collection, show],
				flags: {
					isShowable: true,
				},
			},
			{
				id: "pause",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handlePausePlayback,
			},
			{
				id: "play",
				type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
				options: [
					{
						id: "file",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleRequestFilePlayback,
						options: [
							{
								id: "url",
								type: Discord.ApplicationCommandOptionTypes.String,
								required: true,
							},
						],
					},
					{
						id: "youtube",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: async (client: Client, interaction: Logos.Interaction) =>
							handleRequestQueryPlayback(client, interaction, sources.YouTube),
						options: [query],
					},
				],
			},
			{
				id: "queue",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayPlaybackQueue,
				options: [show],
				flags: {
					isShowable: true,
				},
			},
			{
				id: "remove",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleRemoveSongListing,
			},
			{
				id: "replay",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleReplayAction,
				options: [collection],
			},
			{
				id: "resume",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleResumePlayback,
			},
			{
				id: "rewind",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleRewind,
				handleAutocomplete: handleRewindAutocomplete,
				options: [timestamp],
			},
			{
				id: "skip-to",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleSkipToTimestamp,
				handleAutocomplete: handleSkipToTimestampAutocomplete,
				options: [timestamp],
			},
			{
				id: "skip",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleSkipAction,
				options: [collection, by, to],
			},
			{
				id: "stop",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleStopPlayback,
			},
			{
				id: "unskip",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleUnskipAction,
				options: [collection, by, to],
			},
			{
				id: "volume",
				type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
				options: [
					{
						id: "display",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleDisplayVolume,
						options: [show],
						flags: {
							isShowable: true,
						},
					},
					{
						id: "set",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleSetVolume,
						options: [
							{
								id: "volume",
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
		id: "praise",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handlePraiseUser,
		handleAutocomplete: handlePraiseUserAutocomplete,
		options: [
			user,
			{
				id: "comment",
				type: Discord.ApplicationCommandOptionTypes.String,
			},
		],
	},
	profile: {
		id: "profile",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: [
			{
				id: "view",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayProfile,
				handleAutocomplete: handleDisplayProfileAutocomplete,
				options: [{ ...user, required: false }, show],
				flags: {
					isShowable: true,
				},
			},
			{
				id: "roles",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleOpenRoleSelectionMenu,
			},
		],
	},
} as const satisfies Record<string, CommandTemplate>);
