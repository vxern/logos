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
	handleDisplayAuthorPraises,
	handleDisplayTargetPraises,
	handleDisplayPraisesAutocomplete,
} from "logos/commands/handlers/list/praises";
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
		options: {
			bot: {
				identifier: "bot",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayBotInformation,
			},
			server: {
				identifier: "server",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayGuildInformation,
			},
		},
	},
	list: {
		identifier: "list",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: {
			praises: {
				identifier: "praises",
				type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
				options: {
					author: {
						identifier: "author",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleDisplayAuthorPraises,
						handleAutocomplete: handleDisplayPraisesAutocomplete,
						options: { user: { ...constants.parameters.user, required: false } },
					},
					target: {
						identifier: "target",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleDisplayTargetPraises,
						handleAutocomplete: handleDisplayPraisesAutocomplete,
						options: { user: { ...constants.parameters.user, required: false } },
					},
				},
			},
			warnings: {
				identifier: "warnings",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayWarnings,
				handleAutocomplete: handleDisplayWarningsAutocomplete,
				options: { user: { ...constants.parameters.user, required: false } },
			},
		},
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
		options: { show: constants.parameters.show },
		flags: { isShowable: true },
	},
	correctionPartialMessage: {
		identifier: "correction.options.partial.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		// TODO(vxern): Make these standalone handlers in the correction file.
		handle: (client: Client, interaction: Logos.Interaction) =>
			handleStartCorrecting(client, interaction, { mode: "partial" }),
	},
	correctionFullMessage: {
		identifier: "correction.options.full.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		// TODO(vxern): Make these standalone handlers in the correction file.
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
		options: {
			text: {
				identifier: "text",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
			},
		},
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
		options: { show: constants.parameters.show },
		flags: { isShowable: true },
	},
	translate: {
		identifier: "translate",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleTranslateChatInput,
		handleAutocomplete: handleTranslateChatInputAutocomplete,
		options: {
			text: {
				identifier: "text",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
			},
			to: {
				identifier: "to",
				type: Discord.ApplicationCommandOptionTypes.String,
				autocomplete: true,
			},
			from: {
				identifier: "from",
				type: Discord.ApplicationCommandOptionTypes.String,
				autocomplete: true,
			},
			show: constants.parameters.show,
		},
		flags: { hasRateLimit: true, isShowable: true },
	},
	translateMessage: {
		identifier: "translate.message",
		type: Discord.ApplicationCommandTypes.Message,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleTranslateMessage,
		flags: { isShowable: true },
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
		options: {
			dictionary: {
				identifier: "dictionary",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayDictionaryLicence,
				handleAutocomplete: handleDisplayDictionaryLicenceAutocomplete,
				options: {
					dictionary: {
						identifier: "dictionary",
						type: Discord.ApplicationCommandOptionTypes.String,
						required: true,
						autocomplete: true,
					},
				},
			},
			software: {
				identifier: "software",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplaySoftwareLicence,
				handleAutocomplete: handleDisplaySoftwareLicenceAutocomplete,
				options: {
					package: {
						identifier: "package",
						type: Discord.ApplicationCommandOptionTypes.String,
						required: true,
						autocomplete: true,
					},
				},
			},
		},
	},
	settings: {
		identifier: "settings",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: {
			language: {
				identifier: "language",
				type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
				options: {
					clear: {
						identifier: "clear",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleClearLanguage,
					},
					set: {
						identifier: "set",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleSetLanguage,
						handleAutocomplete: handleSetLanguageAutocomplete,
						options: {
							language: {
								identifier: "language",
								type: Discord.ApplicationCommandOptionTypes.String,
								required: true,
								autocomplete: true,
							},
						},
					},
				},
			},
			view: {
				identifier: "view",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplaySettings,
			},
		},
	},
	// Moderation
	pardon: {
		identifier: "pardon",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handlePardonUser,
		handleAutocomplete: handlePardonUserAutocomplete,
		options: {
			user: constants.parameters.user,
			warning: {
				identifier: "warning",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
				autocomplete: true,
			},
		},
	},
	policy: {
		identifier: "policy",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handleDisplayModerationPolicy,
		options: { show: constants.parameters.show },
		flags: { isShowable: true },
	},
	purge: {
		identifier: "purge",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handlePurgeMessages,
		handleAutocomplete: handlePurgeMessagesAutocomplete,
		options: {
			start: {
				identifier: "start",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
			},
			end: {
				identifier: "end",
				type: Discord.ApplicationCommandOptionTypes.String,
			},
			author: { ...constants.parameters.user, identifier: "author", required: false },
		},
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
		options: {
			rule: {
				identifier: "rule",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
				autocomplete: true,
			},
			show: constants.parameters.show,
		},
		flags: { isShowable: true },
	},
	slowmode: {
		identifier: "slowmode",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handleToggleSlowmode,
		handleAutocomplete: handleToggleSlowmodeAutocomplete,
		options: {
			level: {
				identifier: "level",
				type: Discord.ApplicationCommandOptionTypes.String,
				autocomplete: true,
			},
		},
	},
	timeout: {
		identifier: "timeout",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		options: {
			set: {
				identifier: "set",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleSetTimeout,
				handleAutocomplete: handleSetTimeoutAutocomplete,
				options: {
					user: constants.parameters.user,
					duration: constants.parameters.duration,
					reason: constants.parameters.reason,
				},
			},
			clear: {
				identifier: "clear",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleClearTimeout,
				handleAutocomplete: handleClearTimeoutAutocomplete,
				options: { user: constants.parameters.user },
			},
		},
	},
	warn: {
		identifier: "warn",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["MODERATE_MEMBERS"],
		handle: handleWarnUser,
		handleAutocomplete: handleWarnUserAutocomplete,
		options: {
			user: constants.parameters.user,
			rule: {
				identifier: "rule",
				type: Discord.ApplicationCommandOptionTypes.String,
				required: true,
				autocomplete: true,
			},
			reason: constants.parameters.reason,
		},
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
		options: {
			open: {
				identifier: "open",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleOpenTicket,
			},
		},
	},
	// Social
	music: {
		identifier: "music",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: {
			fastForward: {
				identifier: "fast-forward",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleFastForward,
				handleAutocomplete: handleFastForwardAutocomplete,
				options: { timestamp: constants.parameters.timestamp },
			},
			history: {
				identifier: "history",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayPlaybackHistory,
				options: { show: constants.parameters.show },
				flags: { isShowable: true },
			},
			loop: {
				identifier: "loop",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleLoopPlayback,
				options: { collection: constants.parameters.collection },
			},
			now: {
				identifier: "now",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayCurrentlyPlaying,
				options: { collection: constants.parameters.collection, show: constants.parameters.show },
				flags: { isShowable: true },
			},
			pause: {
				identifier: "pause",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handlePausePlayback,
			},
			play: {
				identifier: "play",
				type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
				options: {
					stream: {
						identifier: "stream",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleRequestStreamPlayback,
						options: {
							url: {
								identifier: "url",
								type: Discord.ApplicationCommandOptionTypes.String,
								required: true,
							},
						},
					},
					youtube: {
						identifier: "youtube",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleRequestYouTubePlayback,
						options: { query: constants.parameters.query },
					},
				},
			},
			queue: {
				identifier: "queue",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayPlaybackQueue,
				options: { show: constants.parameters.show },
				flags: { isShowable: true },
			},
			remove: {
				identifier: "remove",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleRemoveSongListing,
			},
			replay: {
				identifier: "replay",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleReplayAction,
				options: { collection: constants.parameters.collection },
			},
			resume: {
				identifier: "resume",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleResumePlayback,
			},
			rewind: {
				identifier: "rewind",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleRewind,
				handleAutocomplete: handleRewindAutocomplete,
				options: { timestamp: constants.parameters.timestamp },
			},
			skipTo: {
				identifier: "skip-to",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleSkipToTimestamp,
				handleAutocomplete: handleSkipToTimestampAutocomplete,
				options: { timestamp: constants.parameters.timestamp },
			},
			skip: {
				identifier: "skip",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleSkipAction,
				options: {
					collection: constants.parameters.collection,
					by: constants.parameters.by,
					to: constants.parameters.to,
				},
			},
			stop: {
				identifier: "stop",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleStopPlayback,
			},
			unskip: {
				identifier: "unskip",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleUnskipAction,
				options: {
					collection: constants.parameters.collection,
					by: constants.parameters.by,
					to: constants.parameters.to,
				},
			},
			volume: {
				identifier: "volume",
				type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
				options: {
					display: {
						identifier: "display",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleDisplayVolume,
						options: { show: constants.parameters.show },
						flags: { isShowable: true },
					},
					set: {
						identifier: "set",
						type: Discord.ApplicationCommandOptionTypes.SubCommand,
						handle: handleSetVolume,
						options: {
							volume: {
								identifier: "volume",
								type: Discord.ApplicationCommandOptionTypes.Integer,
								required: true,
							},
						},
					},
				},
			},
		},
	},
	praise: {
		identifier: "praise",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		handle: handlePraiseUser,
		handleAutocomplete: handlePraiseUserAutocomplete,
		options: {
			user: constants.parameters.user,
			comment: {
				identifier: "comment",
				type: Discord.ApplicationCommandOptionTypes.String,
			},
		},
	},
	profile: {
		identifier: "profile",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		options: {
			view: {
				identifier: "view",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleDisplayProfile,
				handleAutocomplete: handleDisplayProfileAutocomplete,
				options: { user: { ...constants.parameters.user, required: false }, show: constants.parameters.show },
				flags: { isShowable: true },
			},
			roles: {
				identifier: "roles",
				type: Discord.ApplicationCommandOptionTypes.SubCommand,
				handle: handleOpenRoleSelectionMenu,
			},
		},
	},
} satisfies Record<string, CommandTemplate>);
type Commands = typeof commands;
type CommandName = keyof Commands;

type BuiltCommands = Commands & Record<CommandName, BuiltCommand>;

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

interface CommandBuilderBase<Generic extends { built: boolean }> extends OptionMetadata {
	readonly type: Discord.ApplicationCommandTypes;
	readonly defaultMemberPermissions: Discord.PermissionStrings[];
	readonly options?: Record<string, OptionBuilder<Generic>>;
}
type CommandBuilder<Generic extends { built: boolean } = { built: boolean }> = true extends Generic["built"]
	? CommandBuilderBase<Generic> & { built: Discord.CreateApplicationCommand }
	: CommandBuilderBase<Generic>;

interface OptionBuilderBase<Generic extends { built: boolean }> extends OptionMetadata {
	readonly type: Discord.ApplicationCommandOptionTypes;
	readonly required?: boolean;
	readonly choices?: Discord.ApplicationCommandOptionChoice[];
	readonly channelTypes?: Discord.ChannelTypes[];
	readonly minimumValue?: number;
	readonly maximumValue?: number;
	readonly minimumLength?: number;
	readonly maximumLength?: number;
	readonly autocomplete?: boolean;
	readonly options?: Record<string, OptionBuilder<Generic>>;
}
type OptionBuilder<Generic extends { built: boolean } = { built: boolean }> = true extends Generic["built"]
	? OptionBuilderBase<Generic> & { built: Discord.ApplicationCommandOption }
	: OptionBuilderBase<Generic>;

type CommandTemplate = CommandBuilder<{ built: false }>;
type OptionTemplate = OptionBuilder<{ built: false }>;

type BuiltCommand = CommandBuilder<{ built: true }>;
type BuiltOption = OptionBuilder<{ built: true }>;

export default commands;
export type {
	CommandBuilder,
	OptionBuilder,
	BuiltCommands,
	BuiltCommand,
	BuiltOption,
	Command,
	CommandName,
	CommandTemplate,
	OptionMetadata,
	Option,
	OptionTemplate,
};
