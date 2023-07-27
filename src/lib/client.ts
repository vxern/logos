import constants from "../constants/constants";
import { Language, defaultLanguage, getLanguageByLocale, getLocaleForLanguage } from "../constants/language";
import time from "../constants/time";
import defaults from "../defaults";
import { timestamp } from "../formatting";
import * as Logos from "../types";
import { Command, CommandTemplate, InteractionHandler, LocalisationProperties, Option } from "./commands/command";
import commandsRaw from "./commands/commands";
import { SentencePair } from "./commands/language/commands/game";
import { DictionaryAdapter } from "./commands/language/dictionaries/adapter";
import { SupportedLanguage } from "./commands/language/module";
import entryRequests from "./database/adapters/entry-requests";
import guilds from "./database/adapters/guilds";
import praises from "./database/adapters/praises";
import reports from "./database/adapters/reports";
import suggestions from "./database/adapters/suggestions";
import users from "./database/adapters/users";
import warnings from "./database/adapters/warnings";
import { Database } from "./database/database";
import { timeStructToMilliseconds } from "./database/structs/guild";
import { acknowledge, deleteReply, isAutocomplete, reply, respond } from "./interactions";
import transformers from "./localisation/transformers";
import { AlertService } from "./services/alert/alert";
import { DynamicVoiceChannelService } from "./services/dynamic-voice-channels/dynamic-voice-channels";
import { EntryService } from "./services/entry/entry";
import { JournallingService } from "./services/journalling/journalling";
import { LavalinkService } from "./services/music/lavalink";
import { MusicService } from "./services/music/music";
import { InformationNoticeService } from "./services/notices/types/information";
import { RoleNoticeService } from "./services/notices/types/roles";
import { WelcomeNoticeService } from "./services/notices/types/welcome";
import { ReportService } from "./services/prompts/types/reports";
import { SuggestionService } from "./services/prompts/types/suggestions";
import { VerificationService } from "./services/prompts/types/verification";
import { Service } from "./services/service";
import { StatusService } from "./services/status/service";
import { diagnosticMentionUser, fetchMembers } from "./utils";
import * as Discord from "discordeno";
import FancyLog from "fancy-log";
import Fauna from "fauna";
import * as Sentry from "sentry";

interface Collector<ForEvent extends keyof Discord.EventHandlers> {
	filter: (...args: Parameters<Discord.EventHandlers[ForEvent]>) => boolean;
	limit?: number;
	removeAfter?: number;
	onCollect: (...args: Parameters<Discord.EventHandlers[ForEvent]>) => void;
	onEnd: () => void;
}

type Event = keyof Discord.EventHandlers;

type Client = {
	metadata: {
		environment: {
			environment: "production" | "staging" | "development" | "restricted";
			version: string;
			discordSecret: string;
			faunaSecret: string;
			deeplSecret: string;
			sentrySecret: string;
			lavalinkHost: string;
			lavalinkPort: string;
			lavalinkPassword: string;
		};
		supportedTranslationLanguages: SupportedLanguage[];
	};
	log: Record<"debug" | keyof typeof FancyLog, (...args: unknown[]) => void>;
	cache: {
		guilds: Map<bigint, Logos.Guild>;
		users: Map<bigint, Logos.User>;
		members: Map<bigint, Logos.Member>;
		channels: Map<bigint, Logos.Channel>;
		messages: {
			latest: Map<bigint, Logos.Message>;
			previous: Map<bigint, Logos.Message>;
		};
	};
	database: Database;
	commands: {
		commands: Record<keyof typeof commandsRaw, Command>;
		handlers: {
			execute: Map<string, InteractionHandler>;
			autocomplete: Map<string, InteractionHandler>;
		};
	};
	collectors: Map<Event, Set<Collector<Event>>>;
	features: {
		dictionaryAdapters: Map<Language, DictionaryAdapter[]>;
		sentencePairs: Map<Language, SentencePair[]>;
		// The keys are user IDs, the values are command usage timestamps mapped by command IDs.
		rateLimiting: Map<bigint, Map<bigint, number[]>>;
	};
	localisations: Map<string, Map<Language, (args: Record<string, unknown>) => string>>;
	services: {
		global: Service[];
		local: Map<bigint, Service[]>;
	} & {
		alerts: Map<bigint, AlertService>;
		dynamicVoiceChannels: Map<bigint, DynamicVoiceChannelService>;
		entry: Map<bigint, EntryService>;
		journalling: Map<bigint, JournallingService>;
		music: {
			lavalink: LavalinkService;
			music: Map<bigint, MusicService>;
		};
		notices: {
			information: Map<bigint, InformationNoticeService>;
			roles: Map<bigint, RoleNoticeService>;
			welcome: Map<bigint, WelcomeNoticeService>;
		};
		prompts: {
			reports: Map<bigint, ReportService>;
			suggestions: Map<bigint, SuggestionService>;
			verification: Map<bigint, VerificationService>;
		};
		status: StatusService;
	};
};

function createClient(
	metadata: Client["metadata"],
	features: Client["features"],
	localisationsStatic: Map<string, Map<Language, string>>,
): Client {
	const localisations = createLocalisations(localisationsStatic);

	const localised = localiseCommands(localisations, commandsRaw);
	const handlers = createCommandHandlers(Object.values(commandsRaw));

	return {
		metadata,
		log: {
			debug: (...args: unknown[]) => {
				FancyLog.info(...args);
			},
			info: (...args: unknown[]) => {
				FancyLog.info(...args);
			},
			dir: (...args: unknown[]) => {
				FancyLog.dir(...args);
			},
			error: (...args: unknown[]) => {
				FancyLog.error(...args);
			},
			warn: (...args: unknown[]) => {
				FancyLog.warn(...args);
			},
		},
		cache: {
			guilds: new Map(),
			users: new Map(),
			members: new Map(),
			channels: new Map(),
			messages: {
				latest: new Map(),
				previous: new Map(),
			},
		},
		database: {
			client: new Fauna.Client({
				secret: metadata.environment.faunaSecret,
				domain: "db.us.fauna.com",
				scheme: "https",
				port: 443,
			}),
			cache: {
				entryRequestBySubmitterAndGuild: new Map(),
				guildById: new Map(),
				praisesBySender: new Map(),
				praisesByRecipient: new Map(),
				reportsByAuthorAndGuild: new Map(),
				suggestionsByAuthorAndGuild: new Map(),
				usersByReference: new Map(),
				usersById: new Map(),
				warningsByRecipient: new Map(),
			},
			fetchPromises: {
				guilds: {
					id: new Map(),
				},
				praises: {
					recipient: new Map(),
					sender: new Map(),
				},
				users: {
					id: new Map(),
					reference: new Map(),
				},
				warnings: {
					recipient: new Map(),
				},
			},
			adapters: { entryRequests, guilds, reports, praises, suggestions, users, warnings },
		},
		commands: { commands: localised, handlers },
		features,
		localisations,
		collectors: new Map(),
		services: {
			global: [],
			local: new Map(),
			alerts: new Map(),
			dynamicVoiceChannels: new Map(),
			entry: new Map(),
			journalling: new Map(),
			music: {
				// @ts-ignore: Late assignment.
				lavalink: "late_assignment",
				music: new Map(),
			},
			notices: {
				information: new Map(),
				roles: new Map(),
				welcome: new Map(),
			},
			prompts: {
				reports: new Map(),
				suggestions: new Map(),
				verification: new Map(),
			},
			// @ts-ignore: Late assignment.
			status: "late_assignment",
		},
	};
}

async function dispatchGlobal<EventName extends keyof Discord.EventHandlers>(
	client: Client,
	eventName: EventName,
	{ args }: { args: Parameters<Discord.EventHandlers[EventName]> },
): Promise<void> {
	for (const service of client.services.global) {
		service[eventName](...args);
	}
}

async function dispatchLocal<EventName extends keyof Discord.EventHandlers>(
	client: Client,
	guildId: bigint,
	eventName: EventName,
	{ args }: { args: Parameters<Discord.EventHandlers[EventName]> },
): Promise<void> {
	const services = client.services.local.get(guildId);
	if (services === undefined) {
		return;
	}

	for (const service of services) {
		service[eventName](...args);
	}
}

async function dispatchEvent<EventName extends keyof Discord.EventHandlers>(
	client: Client,
	guildId: bigint | undefined,
	eventName: EventName,
	{ args }: { args: Parameters<Discord.EventHandlers[EventName]> },
): Promise<void> {
	dispatchGlobal(client, eventName, { args });

	if (guildId !== undefined) {
		dispatchLocal(client, guildId, eventName, { args });
	}
}

async function initialiseClient(
	metadata: Client["metadata"],
	features: Client["features"],
	localisations: Map<string, Map<Language, string>>,
): Promise<void> {
	const client = createClient(metadata, features, localisations);

	await prefetchDataFromDatabase(client, client.database);

	const bot = overrideDefaultEventHandlers(
		Discord.createBot({
			token: metadata.environment.discordSecret,
			intents:
				Discord.Intents.Guilds |
				Discord.Intents.GuildMembers |
				Discord.Intents.GuildBans |
				Discord.Intents.GuildVoiceStates |
				Discord.Intents.GuildMessages |
				Discord.Intents.MessageContent,
			events: {
				async ready(...args) {
					dispatchGlobal(client, "ready", { args });
				},
				async interactionCreate(bot, interaction) {
					await handleInteractionCreate(client, bot, interaction);

					dispatchEvent(client, interaction.guildId, "interactionCreate", { args: [bot, interaction] });
				},
				async guildMemberAdd(bot, member, user) {
					dispatchEvent(client, member.guildId, "guildMemberAdd", { args: [bot, member, user] });
				},
				async guildMemberRemove(bot, user, guildId) {
					dispatchEvent(client, guildId, "guildMemberRemove", { args: [bot, user, guildId] });
				},
				async guildMemberUpdate(bot, member, user) {
					dispatchEvent(client, member.guildId, "guildMemberUpdate", { args: [bot, member, user] });
				},
				async messageCreate(bot, message) {
					dispatchEvent(client, message.guildId, "messageCreate", { args: [bot, message] });
				},
				async messageDelete(bot, payload, message) {
					dispatchEvent(client, payload.guildId, "messageDelete", { args: [bot, payload, message] });
				},
				async messageDeleteBulk(bot, payload) {
					dispatchEvent(client, payload.guildId, "messageDeleteBulk", { args: [bot, payload] });
				},
				async messageUpdate(bot, message, oldMessage) {
					dispatchEvent(client, message.guildId, "messageUpdate", { args: [bot, message, oldMessage] });
				},
				async voiceServerUpdate(bot, payload) {
					dispatchEvent(client, payload.guildId, "voiceServerUpdate", { args: [bot, payload] });
				},
				async voiceStateUpdate(bot, voiceState) {
					dispatchEvent(client, voiceState.guildId, "voiceStateUpdate", { args: [bot, voiceState] });
				},
				async channelCreate(bot, channel) {
					dispatchEvent(client, channel.guildId, "channelCreate", { args: [bot, channel] });
				},
				async channelDelete(bot, channel) {
					client.cache.channels.delete(channel.id);
					client.cache.guilds.get(channel.guildId)?.channels.delete(channel.id);

					dispatchEvent(client, channel.guildId, "channelDelete", { args: [bot, channel] });
				},
				async channelPinsUpdate(bot, data) {
					dispatchEvent(client, data.guildId, "channelPinsUpdate", { args: [bot, data] });
				},
				async channelUpdate(bot, channel) {
					dispatchEvent(client, channel.guildId, "channelUpdate", { args: [bot, channel] });
				},
				async guildEmojisUpdate(bot, payload) {
					dispatchEvent(client, payload.guildId, "guildEmojisUpdate", { args: [bot, payload] });
				},
				async guildBanAdd(bot, user, guildId) {
					dispatchEvent(client, guildId, "guildBanAdd", { args: [bot, user, guildId] });
				},
				async guildBanRemove(bot, user, guildId) {
					dispatchEvent(client, guildId, "guildBanRemove", { args: [bot, user, guildId] });
				},
				async guildCreate(bot, guild) {
					await handleGuildCreate(client, bot, guild);

					dispatchEvent(client, guild.id, "guildCreate", { args: [bot, guild] });
				},
				async guildDelete(bot, id, shardId) {
					const guildId = id;
					client.cache.guilds.delete(guildId);

					const runningServices = client.services.local.get(guildId) ?? [];
					client.services.local.delete(guildId);
					for (const runningService of runningServices) {
						runningService.stop(bot);
					}

					dispatchEvent(client, guildId, "guildDelete", { args: [bot, guildId, shardId] });
				},
				async guildUpdate(bot, guild) {
					dispatchEvent(client, guild.id, "guildUpdate", { args: [bot, guild] });
				},
				async roleCreate(bot, role) {
					dispatchEvent(client, role.guildId, "roleCreate", { args: [bot, role] });
				},
				async roleDelete(bot, role) {
					dispatchEvent(client, role.guildId, "roleDelete", { args: [bot, role] });
				},
				async roleUpdate(bot, role) {
					dispatchEvent(client, role.guildId, "roleUpdate", { args: [bot, role] });
				},
			},
			transformers: withCaching(client, Discord.createTransformers({})),
		}),
	);

	const lavalinkService = new LavalinkService(client, bot);
	client.services.global.push(lavalinkService);
	client.services.music.lavalink = lavalinkService;
	await lavalinkService.start(bot);

	await Discord.startBot(bot);

	const statusService = new StatusService(client);
	client.services.global.push(statusService);
	client.services.status = statusService;
	await statusService.start(bot);
}

async function prefetchDataFromDatabase(client: Client, database: Database): Promise<void> {
	await Promise.all([
		database.adapters.entryRequests.prefetch(client),
		database.adapters.reports.prefetch(client),
		database.adapters.suggestions.prefetch(client),
	]);
}

function overrideDefaultEventHandlers(bot: Discord.Bot): Discord.Bot {
	bot.handlers.MESSAGE_UPDATE = (bot, data) => {
		const messageData = data.d as Discord.DiscordMessage;
		if (!("author" in messageData)) {
			return;
		}

		bot.events.messageUpdate(bot, bot.transformers.message(bot, messageData));
	};

	return bot;
}

async function handleGuildCreate(client: Client, bot: Discord.Bot, guild: Discord.Guild): Promise<void> {
	const guildDocument = await client.database.adapters.guilds.getOrFetchOrCreate(
		client,
		"id",
		guild.id.toString(),
		guild.id,
	);
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.data;

	const commands = client.commands.commands;

	const guildCommands: Command[] = [commands.information];
	const services: Service[] = [];

	if (configuration.features.information.enabled) {
		const information = configuration.features.information.features;

		if (information.journaling.enabled) {
			const service = new JournallingService(client, guild.id);
			services.push(service);

			client.services.journalling.set(guild.id, service);
		}

		if (information.notices.enabled) {
			const notices = information.notices.features;

			if (notices.information.enabled) {
				const service = new InformationNoticeService(client, guild.id);
				services.push(service);

				client.services.notices.information.set(guild.id, service);
			}

			if (notices.roles.enabled) {
				const service = new RoleNoticeService(client, guild.id);
				services.push(service);

				client.services.notices.roles.set(guild.id, service);
			}

			if (notices.welcome.enabled) {
				const service = new WelcomeNoticeService(client, guild.id);
				services.push(service);

				client.services.notices.welcome.set(guild.id, service);
			}
		}
	}

	if (configuration.features.language.enabled) {
		const language = configuration.features.language.features;

		if (language.game.enabled) {
			guildCommands.push(commands.game);
		}

		if (language.resources.enabled) {
			guildCommands.push(commands.resources);
		}

		if (language.translate.enabled) {
			guildCommands.push(commands.translate);
		}

		if (language.word.enabled) {
			guildCommands.push(commands.word);
		}
	}

	if (configuration.features.moderation.enabled) {
		guildCommands.push(commands.list);

		const moderation = configuration.features.moderation.features;

		if (moderation.alerts.enabled) {
			const service = new AlertService(client, guild.id);
			services.push(service);

			client.services.alerts.set(guild.id, service);
		}

		if (moderation.policy.enabled) {
			guildCommands.push(commands.policy);
		}

		if (moderation.rules.enabled) {
			guildCommands.push(commands.rule);
		}

		if (moderation.timeouts.enabled) {
			guildCommands.push(commands.timeout);
		}

		if (moderation.purging.enabled) {
			guildCommands.push(commands.purge);
		}

		if (moderation.warns.enabled) {
			guildCommands.push(commands.warn, commands.pardon);
		}

		if (moderation.reports.enabled) {
			guildCommands.push(commands.report);

			const service = new ReportService(client, guild.id);
			services.push(service);

			client.services.prompts.reports.set(guild.id, service);
		}

		if (moderation.verification.enabled) {
			const service = new VerificationService(client, guild.id);
			services.push(service);

			client.services.prompts.verification.set(guild.id, service);
		}
	}

	if (configuration.features.server.enabled) {
		const server = configuration.features.server.features;

		if (server.dynamicVoiceChannels.enabled) {
			const service = new DynamicVoiceChannelService(client, guild.id);
			services.push(service);

			client.services.dynamicVoiceChannels.set(guild.id, service);
		}

		if (server.entry.enabled) {
			const service = new EntryService(client, guild.id);
			services.push(service);

			client.services.entry.set(guild.id, service);
		}

		if (server.suggestions.enabled) {
			guildCommands.push(commands.suggestion);

			const service = new SuggestionService(client, guild.id);
			services.push(service);

			client.services.prompts.suggestions.set(guild.id, service);
		}
	}

	if (configuration.features.social.enabled) {
		const social = configuration.features.social.features;

		if (social.music.enabled) {
			guildCommands.push(commands.music);

			const service = new MusicService(client, guild.id);
			services.push(service);

			client.services.music.music.set(guild.id, service);
		}

		if (social.praises.enabled) {
			guildCommands.push(commands.praise);
		}

		if (social.profile.enabled) {
			guildCommands.push(commands.profile);
		}
	}

	await Discord.upsertGuildApplicationCommands(bot, guild.id, guildCommands).catch((reason) =>
		client.log.warn(`Failed to upsert commands: ${reason}`),
	);

	client.log.info(`Fetching ~${guild.memberCount} members on guild with ID ${guild.id}...`);

	await fetchMembers(bot, guild.id, { limit: 0, query: "" }).catch((reason) =>
		client.log.warn(`Failed to fetch members for guild with ID ${guild.id}: ${reason}`),
	);

	client.log.info(`Fetched ~${guild.memberCount} members on guild with ID ${guild.id}.`);

	for (const service of services) {
		service.start(bot);
	}

	client.services.local.set(guild.id, services);

	global.gc?.();
}

async function handleInteractionCreate(
	client: Client,
	bot: Discord.Bot,
	interaction: Discord.Interaction,
): Promise<void> {
	if (interaction.data?.customId === constants.components.none) {
		acknowledge([client, bot], interaction);
		return;
	}

	const commandName = interaction.data?.name;
	if (commandName === undefined) {
		return;
	}

	const subCommandGroupOption = interaction.data?.options?.find((option) => isSubcommandGroup(option));

	let commandNameFull: string;
	if (subCommandGroupOption !== undefined) {
		const subCommandGroupName = subCommandGroupOption.name;
		const subCommandName = subCommandGroupOption.options?.find((option) => isSubcommand(option))?.name;
		if (subCommandName === undefined) {
			return;
		}

		commandNameFull = `${commandName} ${subCommandGroupName} ${subCommandName}`;
	} else {
		const subCommandName = interaction.data?.options?.find((option) => isSubcommand(option))?.name;
		if (subCommandName === undefined) {
			commandNameFull = commandName;
		} else {
			commandNameFull = `${commandName} ${subCommandName}`;
		}
	}

	let handle: InteractionHandler | undefined;
	if (isAutocomplete(interaction)) {
		handle = client.commands.handlers.autocomplete.get(commandNameFull);
	} else {
		handle = client.commands.handlers.execute.get(commandNameFull);
	}
	if (handle === undefined) {
		return;
	}

	Promise.resolve(handle([client, bot], interaction)).catch((exception) => {
		Sentry.captureException(exception);
		client.log.error(exception);
	});
}

function withCaching(client: Client, transformers: Discord.Transformers): Discord.Transformers {
	const { guild, channel, user, member, message, role, voiceState } = transformers;

	transformers.guild = (bot, payload) => {
		const resultUnoptimised = guild(bot, payload);
		const result = Logos.slimGuild(resultUnoptimised);

		for (const channel of payload.guild.channels ?? []) {
			bot.transformers.channel(bot, { channel, guildId: result.id });
		}

		client.cache.guilds.set(result.id, result);

		return resultUnoptimised;
	};

	transformers.channel = (...args) => {
		const resultUnoptimised = channel(...args);
		const result = Logos.slimChannel(resultUnoptimised);

		client.cache.channels.set(result.id, result);

		client.cache.guilds.get(result.guildId)?.channels.set(result.id, result);

		return resultUnoptimised;
	};

	transformers.user = (...args) => {
		const resultUnoptimised = user(...args);
		const result = Logos.slimUser(resultUnoptimised);

		client.cache.users.set(result.id, result);

		return resultUnoptimised;
	};

	transformers.member = (bot, payload, ...args) => {
		const resultUnoptimised = member(bot, payload, ...args);
		const result = Logos.slimMember(resultUnoptimised);

		const memberSnowflake = bot.transformers.snowflake(`${result.id}${result.guildId}`);

		client.cache.members.set(memberSnowflake, result);

		client.cache.guilds.get(result.guildId)?.members.set(result.id, result);

		return resultUnoptimised;
	};

	transformers.message = (bot, payload) => {
		const resultUnoptimised = message(bot, payload);
		const result = Logos.slimMessage(resultUnoptimised);

		const previousMessage = client.cache.messages.latest.get(result.id);
		if (previousMessage !== undefined) {
			client.cache.messages.previous.set(result.id, previousMessage);
		}

		client.cache.messages.latest.set(result.id, result);

		const user = bot.transformers.user(bot, payload.author);

		client.cache.users.set(user.id, user);

		if (payload.member !== undefined && payload.guild_id !== undefined) {
			const guildId = bot.transformers.snowflake(payload.guild_id);

			const member = bot.transformers.member(bot, { ...payload.member, user: payload.author }, guildId, user.id);

			const memberSnowflake = bot.transformers.snowflake(`${member.id}${member.guildId}`);

			client.cache.members.set(memberSnowflake, member);
		}

		return resultUnoptimised;
	};

	transformers.role = (bot, payload) => {
		const resultUnoptimised = role(bot, payload);
		const result = Logos.slimRole(resultUnoptimised);

		client.cache.guilds.get(result.guildId)?.roles.set(result.id, result);

		return resultUnoptimised;
	};

	transformers.voiceState = (bot, payload) => {
		const resultUnoptimised = voiceState(bot, payload);
		const result = Logos.slimVoiceState(resultUnoptimised);

		if (result.channelId !== undefined) {
			client.cache.guilds.get(result.guildId)?.voiceStates.set(result.userId, result);
		} else {
			client.cache.guilds.get(result.guildId)?.voiceStates.delete(result.userId);
		}

		return resultUnoptimised;
	};

	return transformers;
}

function withRateLimiting(handle: InteractionHandler): InteractionHandler {
	return async ([client, bot], interaction) => {
		if (isAutocomplete(interaction)) {
			return;
		}

		const commandId = interaction.data?.id;
		if (commandId === undefined) {
			return handle([client, bot], interaction);
		}

		const executedAt = Date.now();

		const rateLimitIntervalMilliseconds = timeStructToMilliseconds(defaults.RATE_LIMIT_INTERVAL);
		const timestampsByCommandId = client.features.rateLimiting.get(interaction.user.id) ?? new Map();
		const timestamps = [...(timestampsByCommandId.get(commandId) ?? []), executedAt];
		const activeTimestamps = timestamps.filter((timestamp) => Date.now() - timestamp <= rateLimitIntervalMilliseconds);

		if (activeTimestamps.length > defaults.RATE_LIMIT) {
			const firstTimestamp = activeTimestamps.at(0);
			if (firstTimestamp) {
				throw "StateError: Unexpected undefined initial timestamp.";
			}

			const now = Date.now();

			const nextValidUsageTimestamp = now + rateLimitIntervalMilliseconds - (now - firstTimestamp);
			const nextValidUsageTimestampFormatted = timestamp(nextValidUsageTimestamp);

			const strings = {
				title: localise(client, "interactions.rateLimited.title", interaction.locale)(),
				description: {
					tooManyUses: localise(
						client,
						"interactions.rateLimited.description.tooManyUses",
						interaction.locale,
					)({ times: defaults.RATE_LIMIT }),
					cannotUseUntil: localise(
						client,
						"interactions.rateLimited.description.cannotUseAgainUntil",
						interaction.locale,
					)({ relative_timestamp: nextValidUsageTimestampFormatted }),
				},
			};

			setTimeout(() => deleteReply([client, bot], interaction), nextValidUsageTimestamp - now - time.second);

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.tooManyUses}\n\n${strings.description.cannotUseUntil}`,
						color: constants.colors.dullYellow,
					},
				],
			});
			return;
		}

		timestampsByCommandId.set(commandId, activeTimestamps);

		return handle([client, bot], interaction);
	};
}

function localiseCommands<CommandsRaw extends Record<string, CommandTemplate>, CommandName extends keyof CommandsRaw>(
	localisations: Client["localisations"],
	commandsRaw: CommandsRaw,
): Record<CommandName, Command> {
	function localiseCommandOrOption(key: string): Pick<Command, LocalisationProperties> | undefined {
		const optionName = key.split(".")?.at(-1);
		if (optionName === undefined) {
			console.warn(`Failed to get option name from localisation key '${key}'.`);
			return undefined;
		}

		const nameLocalisationsAll = localisations.get(`${key}.name`) ?? localisations.get(`parameters.${optionName}.name`);
		const nameLocalisations =
			nameLocalisationsAll !== undefined ? toDiscordLocalisations(nameLocalisationsAll) : undefined;

		const descriptionLocalisationsAll =
			localisations.get(`${key}.description`) ?? localisations.get(`parameters.${optionName}.description`);
		const description = descriptionLocalisationsAll?.get(defaultLanguage)?.({});
		const descriptionLocalisations =
			descriptionLocalisationsAll !== undefined ? toDiscordLocalisations(descriptionLocalisationsAll) : undefined;

		return {
			nameLocalizations: nameLocalisations ?? {},
			description: description ?? localisations.get("noDescription")?.get(defaultLanguage)?.({}) ?? "No description.",
			descriptionLocalizations: descriptionLocalisations ?? {},
		};
	}

	const commands: Partial<Record<CommandName, Command>> = {};
	for (const [commandName, commandRaw] of Object.entries(commandsRaw) as [CommandName, CommandTemplate][]) {
		const commandKey = commandRaw.name;
		const localisations = localiseCommandOrOption(commandKey);
		if (localisations === undefined) {
			continue;
		}

		const command: Command = { ...localisations, ...commandRaw, options: [] };

		for (const optionTemplate of commandRaw.options ?? []) {
			const optionKey = [commandKey, "options", optionTemplate.name].join(".");
			const localisations = localiseCommandOrOption(optionKey);
			if (localisations === undefined) {
				continue;
			}

			const option: Option = { ...localisations, ...optionTemplate, options: [] };

			for (const subOptionTemplate of optionTemplate.options ?? []) {
				const subOptionKey = [optionKey, "options", subOptionTemplate.name].join(".");
				const localisations = localiseCommandOrOption(subOptionKey);
				if (localisations === undefined) {
					continue;
				}

				const subOption: Option = { ...localisations, ...subOptionTemplate, options: [] };

				for (const subSubOptionTemplate of subOptionTemplate.options ?? []) {
					const subSubOptionKey = [subOptionKey, "options", subSubOptionTemplate.name].join(".");
					const localisations = localiseCommandOrOption(subSubOptionKey);
					if (localisations === undefined) {
						continue;
					}

					const subSubOption: Option = { ...localisations, ...subSubOptionTemplate, options: [] };

					subOption.options?.push(subSubOption);
				}

				option.options?.push(subOption);
			}

			command.options?.push(option);
		}

		commands[commandName] = command;
	}

	return commands as Record<CommandName, Command>;
}

function createCommandHandlers(commands: CommandTemplate[]): Client["commands"]["handlers"] {
	const handlers = new Map<string, InteractionHandler>();
	const autocompleteHandlers = new Map<string, InteractionHandler>();

	for (const command of commands) {
		if (command.handle !== undefined) {
			handlers.set(command.name, command.isRateLimited ? withRateLimiting(command.handle) : command.handle);
		}

		if (command.handleAutocomplete !== undefined) {
			autocompleteHandlers.set(command.name, command.handleAutocomplete);
		}

		if (command.options === undefined) {
			continue;
		}

		for (const option of command.options) {
			if (option.handle !== undefined) {
				handlers.set(
					`${command.name} ${option.name}`,
					command.isRateLimited || option.isRateLimited ? withRateLimiting(option.handle) : option.handle,
				);
			}

			if (option.handleAutocomplete !== undefined) {
				autocompleteHandlers.set(`${command.name} ${option.name}`, option.handleAutocomplete);
			}

			if (option.options === undefined) {
				continue;
			}

			for (const subOption of option.options) {
				if (subOption.handle !== undefined) {
					handlers.set(
						`${command.name} ${option.name} ${subOption.name}`,
						command.isRateLimited || option.isRateLimited || subOption.isRateLimited
							? withRateLimiting(subOption.handle)
							: subOption.handle,
					);
				}

				if (subOption.handleAutocomplete !== undefined) {
					autocompleteHandlers.set(`${command.name} ${option.name} ${subOption.name}`, subOption.handleAutocomplete);
				}
			}
		}
	}

	return { execute: handlers, autocomplete: autocompleteHandlers };
}

function addCollector<T extends keyof Discord.EventHandlers>(
	[client, bot]: [Client, Discord.Bot],
	event: T,
	collector: Collector<T>,
): void {
	const onEnd = collector.onEnd;
	collector.onEnd = () => {
		collectors?.delete(collector);
		onEnd();
	};

	if (collector.limit !== undefined) {
		let emitCount = 0;
		const onCollect = collector.onCollect;
		collector.onCollect = (...args) => {
			emitCount++;

			if (emitCount === collector.limit) {
				collector.onEnd();
			}

			onCollect(...args);
		};
	}

	const { removeAfter } = collector;
	if (removeAfter !== undefined) {
		setTimeout(collector.onEnd, removeAfter);
	}

	if (!client.collectors.has(event)) {
		const collectors: Set<Collector<keyof Discord.EventHandlers>> = new Set();
		client.collectors.set(event, collectors);

		extendEventHandler(bot, event, { prepend: true }, (...args) => {
			for (const collector of collectors) {
				if (!collector.filter(...args)) {
					continue;
				}

				collector.onCollect(...args);
			}
		});
	}

	const collectors = client.collectors.get(event);
	if (collectors === undefined) {
		return;
	}

	collectors.add(collector);
}

const snowflakePattern = new RegExp(/^([0-9]{16,20})$/);
const userMentionPattern = new RegExp(/^<@!?([0-9]{16,20})>$/);

function isValidSnowflake(snowflake: string): boolean {
	return snowflakePattern.test(snowflake);
}

function extractIDFromIdentifier(identifier: string): string | undefined {
	return (
		snowflakePattern.exec(identifier)?.at(1) ??
		displayPattern.exec(identifier)?.at(2) ??
		userMentionPattern.exec(identifier)?.at(1)
	);
}

const displayPattern = new RegExp(/^(.{2,32}(?:#[0-9]{4})?) \(?([0-9]{16,20})\)?$/);
const userTagPattern = new RegExp(/^(.{2,32}(?:#[0-9]{4})?)$/);

function isValidIdentifier(identifier: string): boolean {
	return (
		snowflakePattern.test(identifier) ||
		userMentionPattern.test(identifier) ||
		displayPattern.test(identifier) ||
		userTagPattern.test(identifier)
	);
}

interface MemberNarrowingOptions {
	includeBots: boolean;
	restrictToSelf: boolean;
	restrictToNonSelf: boolean;
	excludeModerators: boolean;
}

function resolveIdentifierToMembers(
	client: Client,
	guildId: bigint,
	userId: bigint,
	identifier: string,
	options: Partial<MemberNarrowingOptions> = {},
): [members: Logos.Member[], isResolved: boolean] | undefined {
	const asker = client.cache.members.get(Discord.snowflakeToBigint(`${userId}${guildId}`));
	if (asker === undefined) {
		return undefined;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return undefined;
	}

	const moderatorRoleIds = guild.roles
		.array()
		.filter((role) => Discord.calculatePermissions(role.permissions).includes("MODERATE_MEMBERS"))
		.map((role) => role.id);
	if (moderatorRoleIds.length === 0) {
		return undefined;
	}

	const id = extractIDFromIdentifier(identifier);
	if (id !== undefined) {
		const member = client.cache.members.get(Discord.snowflakeToBigint(`${id}${guildId}`));
		if (member === undefined) {
			return undefined;
		}

		if (options.restrictToSelf && member.id !== asker.id) {
			return undefined;
		}

		if (options.restrictToNonSelf && member.id === asker.id) {
			return undefined;
		}

		if (options.excludeModerators && moderatorRoleIds.some((roleId) => member.roles.includes(roleId))) {
			return undefined;
		}

		return [[member], true];
	}

	const cachedMembers = options.restrictToSelf ? [asker] : guild.members.array();
	const members = cachedMembers.filter(
		(member) =>
			(options.restrictToNonSelf ? member.user?.id !== asker.user?.id : true) &&
			(options.excludeModerators ? !moderatorRoleIds.some((roleId) => member.roles.includes(roleId)) : true),
	);

	if (userTagPattern.test(identifier)) {
		const member = members.find(
			(member) => member.user !== undefined && `${member.user.username}#${member.user.discriminator}` === identifier,
		);
		if (member === undefined) {
			return [[], false];
		}

		return [[member], true];
	}

	const identifierLowercase = identifier.toLowerCase();
	const matchedMembers = members.filter((member) => {
		if (member.user?.toggles.bot && !options.includeBots) {
			return false;
		}
		if (member.user?.username.toLowerCase().includes(identifierLowercase)) {
			return true;
		}
		if (member.nick?.toLowerCase().includes(identifierLowercase)) {
			return true;
		}
		return false;
	});

	return [matchedMembers, false];
}

async function autocompleteMembers(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	identifier: string,
	options?: Partial<MemberNarrowingOptions>,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return undefined;
	}

	const result = resolveIdentifierToMembers(client, guildId, interaction.user.id, identifier, options);
	if (result === undefined) {
		return;
	}

	const [matchedMembers, _] = result;

	const users: Logos.User[] = [];
	for (const member of matchedMembers) {
		if (users.length === 20) {
			break;
		}

		const user = member.user;
		if (user === undefined) {
			continue;
		}

		users.push(user);
	}

	respond(
		[client, bot],
		interaction,
		users.map((user) => ({ name: diagnosticMentionUser(user), value: user.id.toString() })),
	);
}

function resolveInteractionToMember(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	identifier: string,
	options?: Partial<MemberNarrowingOptions>,
): Logos.Member | undefined {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return undefined;
	}

	const result = resolveIdentifierToMembers(client, guildId, interaction.user.id, identifier, options);
	if (result === undefined) {
		return;
	}

	const [matchedMembers, isResolved] = result;
	if (isResolved) {
		return matchedMembers.at(0);
	}

	if (matchedMembers.length === 0) {
		const strings = {
			title: localise(client, "interactions.invalidUser.title", interaction.locale)(),
			description: localise(client, "interactions.invalidUser.description", interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});

		return undefined;
	}

	return matchedMembers.at(0);
}

function extendEventHandler<Event extends keyof Discord.EventHandlers, Handler extends Discord.EventHandlers[Event]>(
	bot: Discord.Bot,
	eventName: Event,
	{ prepend = false, append = false }: { prepend: true; append?: false } | { prepend?: false; append: true },
	extension: (...args: Parameters<Handler>) => unknown,
): void {
	const events = bot.events;

	const handler = events[eventName] as (...args: Parameters<Handler>) => unknown;
	events[eventName] = (
		prepend || !append
			? (...args: Parameters<Handler>) => {
					extension(...args);
					handler(...args);
			  }
			: (...args: Parameters<Handler>) => {
					handler(...args);
					extension(...args);
			  }
	) as Handler;
}

function isSubcommandGroup(option: Discord.InteractionDataOption): boolean {
	return option.type === Discord.ApplicationCommandOptionTypes.SubCommandGroup;
}

function isSubcommand(option: Discord.InteractionDataOption): boolean {
	return option.type === Discord.ApplicationCommandOptionTypes.SubCommand;
}

function createLocalisations(localisationsRaw: Map<string, Map<Language, string>>): Client["localisations"] {
	const processLocalisation = (localisation: string, args: Record<string, unknown>) => {
		let result = localisation;
		for (const [key, value] of Object.entries(args)) {
			result = result.replaceAll(`{${key}}`, `${value}`);
		}
		return result;
	};

	const localisations = new Map<string, Map<Language, (args: Record<string, unknown>) => string>>();
	for (const [key, languages] of localisationsRaw.entries()) {
		const functions = new Map<Language, (args: Record<string, unknown>) => string>();

		for (const [language, string] of languages.entries()) {
			functions.set(language, (args: Record<string, unknown>) => processLocalisation(string, args));
		}

		localisations.set(key, functions);
	}

	return localisations;
}

function localise(client: Client, key: string, locale: string | undefined): (args?: Record<string, unknown>) => string {
	const language =
		(locale !== undefined ? getLanguageByLocale(locale as Discord.Locales) : undefined) ?? defaultLanguage;

	const getLocalisation =
		client.localisations.get(key)?.get(language) ?? client.localisations.get(key)?.get(defaultLanguage) ?? (() => key);

	return (args) => {
		const string = getLocalisation(args ?? {});
		if (language !== defaultLanguage && string.trim().length === 0) {
			return localise(client, key, undefined)(args ?? {});
		}

		return string;
	};
}

function toDiscordLocalisations(
	localisations: Map<Language, (args: Record<string, unknown>) => string>,
): Discord.Localization {
	const entries = Array.from(localisations.entries());
	const result: Discord.Localization = {};
	for (const [language, localise] of entries) {
		const locale = getLocaleForLanguage(language);
		if (locale === undefined) {
			continue;
		}

		const string = localise({});
		if (string.length === 0) {
			continue;
		}

		result[locale] = string;
	}
	return result;
}

function pluralise(client: Client, key: string, language: Language, number: number): string {
	const pluralise = transformers[language].pluralise;
	const { one, two, many } = {
		one: client.localisations.get(`${key}.one`)?.get(language)?.({ one: number }),
		two: client.localisations.get(`${key}.two`)?.get(language)?.({ two: number }),
		many: client.localisations.get(`${key}.many`)?.get(language)?.({ many: number }),
	};
	if (one === undefined || two === undefined || many === undefined) {
		return "?";
	}

	const pluralised = pluralise(`${number}`, { one, two, many });
	if (pluralised === undefined) {
		return "?";
	}

	return pluralised;
}

export {
	addCollector,
	autocompleteMembers,
	extendEventHandler,
	initialiseClient,
	isValidIdentifier,
	isValidSnowflake,
	localise,
	resolveIdentifierToMembers,
	resolveInteractionToMember,
	pluralise,
};
export type { Client, Collector };
