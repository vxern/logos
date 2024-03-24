import type { Client } from "logos/client";
import { CommandTemplate } from "logos/commands/command";
import { handleDisplayBotInformation } from "logos/commands/information/commands/information/bot";
import { handleDisplayGuildInformation } from "logos/commands/information/commands/information/guild";
import {
	handleDisplayPraisesByAuthor,
	handleDisplayPraisesByAuthorAutocomplete,
} from "logos/commands/information/commands/list/praises/author";
import {
	handleDisplayPraisesByTarget,
	handleDisplayPraisesByTargetAutocomplete,
} from "logos/commands/information/commands/list/praises/target";
import {
	handleDisplayWarnings,
	handleDisplayWarningsAutocomplete,
} from "logos/commands/information/commands/list/warnings";
import { handleStartAnswering } from "logos/commands/language/commands/answer";
import { handleDisplayCefrGuide } from "logos/commands/language/commands/cefr";
import { handleStartCorrecting } from "logos/commands/language/commands/correction";
import { handleStartGame } from "logos/commands/language/commands/game";
import {
	handleRecogniseLanguageChatInput,
	handleRecogniseLanguageMessage,
} from "logos/commands/language/commands/recognise";
import { handleDisplayResources } from "logos/commands/language/commands/resources";
import {
	handleTranslateChatInput,
	handleTranslateChatInputAutocomplete,
	handleTranslateMessage,
} from "logos/commands/language/commands/translate";
import { handleDisplayAcknowledgements } from "logos/commands/meta/commands/acknowledgements";
import { handleDisplayCredits } from "logos/commands/meta/commands/credits";
import {
	handleDisplayDictionaryLicence,
	handleDisplayDictionaryLicenceAutocomplete,
} from "logos/commands/meta/commands/licence/dictionary";
import {
	handleDisplaySoftwareLicence,
	handleDisplaySoftwareLicenceAutocomplete,
} from "logos/commands/meta/commands/licence/software";
import { handleClearLanguage } from "logos/commands/meta/commands/settings/language/clear";
import { handleSetLanguage, handleSetLanguageAutocomplete } from "logos/commands/meta/commands/settings/language/set";
import { handleDisplaySettings } from "logos/commands/meta/commands/settings/view";
import { handlePardonUser, handlePardonUserAutocomplete } from "logos/commands/moderation/commands/pardon";
import { handleDisplayModerationPolicy } from "logos/commands/moderation/commands/policy";
import { handlePurgeMessages, handlePurgeMessagesAutocomplete } from "logos/commands/moderation/commands/purge";
import { handleMakeReport } from "logos/commands/moderation/commands/report";
import { handleCiteRule, handleCiteRuleAutocomplete } from "logos/commands/moderation/commands/rule";
import { handleToggleSlowmode, handleToggleSlowmodeAutocomplete } from "logos/commands/moderation/commands/slowmode";
import { handleClearTimeout, handleClearTimeoutAutocomplete } from "logos/commands/moderation/commands/timeout/clear";
import { handleSetTimeout, handleSetTimeoutAutocomplete } from "logos/commands/moderation/commands/timeout/set";
import { handleWarnUser, handleWarnUserAutocomplete } from "logos/commands/moderation/commands/warn";
import { handleFastForward, handleFastForwardAutocomplete } from "logos/commands/music/commands/fast-forward";
import { handleDisplayPlaybackHistory } from "logos/commands/music/commands/history";
import { handleLoopPlayback } from "logos/commands/music/commands/loop";
import { handleDisplayCurrentlyPlaying } from "logos/commands/music/commands/now";
import { handlePausePlayback } from "logos/commands/music/commands/pause";
import { handleRequestFilePlayback } from "logos/commands/music/commands/play/file";
import { handleRequestQueryPlayback } from "logos/commands/music/commands/play/query";
import { handleDisplayPlaybackQueue } from "logos/commands/music/commands/queue";
import { handleRemoveSongListing } from "logos/commands/music/commands/remove";
import { handleReplayAction } from "logos/commands/music/commands/replay";
import { handleResumePlayback } from "logos/commands/music/commands/resume";
import { handleRewind, handleRewindAutocomplete } from "logos/commands/music/commands/rewind";
import { handleSkipAction } from "logos/commands/music/commands/skip";
import { handleSkipToTimestamp, handleSkipToTimestampAutocomplete } from "logos/commands/music/commands/skip-to";
import { handleStopPlayback } from "logos/commands/music/commands/stop";
import { handleUnskipAction } from "logos/commands/music/commands/unskip";
import { handleDisplayVolume } from "logos/commands/music/commands/volume/display";
import { handleSetVolume } from "logos/commands/music/commands/volume/set";
import { sources } from "logos/commands/music/data/sources/sources";
import { handleSubmitResource } from "logos/commands/server/commands/resource";
import { handleMakeSuggestion } from "logos/commands/server/commands/suggestion";
import { handleOpenTicket } from "logos/commands/server/commands/ticket/open";
import { handlePraiseUser, handlePraiseUserAutocomplete } from "logos/commands/social/commands/praise";
import { handleOpenRoleSelectionMenu } from "logos/commands/social/commands/profile/roles";
import { handleDisplayProfile, handleDisplayProfileAutocomplete } from "logos/commands/social/commands/profile/view";

// TODO(vxern): Make options named so as to allow referencing specific subcommands.
/**
 * @privateRemarks
 * Commands, command groups and options are ordered alphabetically.
 */
export default Object.freeze({
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
						identifier: "file",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleRequestFilePlayback,
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
						handle: async (client: Client, interaction: Logos.Interaction) =>
							handleRequestQueryPlayback(client, interaction, sources.YouTube),
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
