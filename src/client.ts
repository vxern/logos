import {
	ApplicationCommandInteraction,
	ApplicationCommandType,
	AutocompleteInteraction,
	Client as DiscordClient,
	event,
	Guild,
	Intents,
	lavadeno,
} from '../deps.ts';
import {
	Command,
	createApplicationCommand,
	unifyHandlers,
} from './commands/command.ts';
import modules from './modules/modules.ts';
import services from './modules/services.ts';
import { LoggingController } from './modules/information/controller.ts';
import { MusicController } from './modules/music/controller.ts';
import { loadLanguages } from './modules/language/module.ts';
import { time } from './utils.ts';
import secrets from '../secrets.ts';

const guildName = new RegExp('^Learn ([A-Z][a-z]*)$');

/** The core of the application, used for interacting with the Discord API. */
class Client extends DiscordClient {
	static node: lavadeno.Node;

	/** Languages of the guilds managed by this client. */
	static readonly languages: Map<string, string> = new Map();

	/** Logging controllers pertaining to the guilds managed by this client. */
	static readonly logging: Map<string, LoggingController> = new Map();

	/** Music controllers pertaining to the guilds managed by this client. */
	static readonly music: Map<string, MusicController> = new Map();

	/** Constructs an instance of {@link Client}. */
	constructor() {
		super({
			token: secrets.core.discord.secret,
			intents: Intents.GuildMembers,
			presence: {
				activity: {
					name: 'Deno.',
					type: 'PLAYING',
				},
			},
			canary: true,
			clientProperties: {
				os: 'vxern#7031',
				browser: 'vxern#7031',
				device: 'vxern#7031',
			},
			enableSlash: true,
			disableEnvToken: true,
			fetchGatewayInfo: true,
			compress: true,
			messageCacheMax: 2000,
		});
	}

	/**
	 * Called when {@link Client} is authenticated by Discord, and is ready to use
	 * the API.
	 *
	 * @remarks
	 * This function should __not__ be called externally.
	 */
	@event()
	protected ready(): void {
		time(
			(ms) => `Setup took ${ms}ms`,
			async () => {
				Client.node = new lavadeno.Node({
					connection: secrets.modules.music.lavalink,
					sendGatewayPayload: (_, payload) => this.gateway.send(payload),
				});
				await Client.node.connect(BigInt(this.user!.id));

				const promises = [
					this.setupGuilds(),
					this.setupCommands(),
					this.setupServices(),
					loadLanguages(),
				];

				await Promise.all(promises);
			},
		);
	}

	/** Sets up guilds for managing. */
	async setupGuilds(): Promise<unknown> {
		const promises: Promise<unknown>[] = [];

		const guilds = await this.guilds.array();
		for (const guild of guilds) {
			promises.push(
				guild.chunk({}, true),
				guild.roles.fetchAll(),
			);

			this.manageGuild(guild);
			this.setupControllers(guild);
		}

		return Promise.all(promises);
	}

	manageGuild(guild: Guild): void {
		const guildNameMatch = guildName.exec(guild.name!) || undefined;

		const language = !guildNameMatch
			? 'english'
			: guildNameMatch![1]!.toLowerCase();

		Client.languages.set(guild.id, language);
	}

	async setupCommands(): Promise<unknown> {
		this.interactions.on('interactionError', console.error);

		const commands = modules.commands;
		for (const command of commands) {
			command.handle = unifyHandlers(command);
			this.manageCommand(command);

			if (!command.options) continue;

			const autocompleteOptions = command.options!.filter((option) =>
				option.autocomplete
			);

			for (const option of autocompleteOptions) {
				this.interactions.autocomplete(
					command.name,
					option.name,
					command.handle!,
				);
			}

			const handlers = new Map<string, Map<string, InteractionHandler>>();
			for (const option of command.options) {
				if (!option.options) continue;

				const autocompleteSubOptions = option.options!.filter((subOption) =>
					subOption.autocomplete
				);

				for (const subOption of autocompleteSubOptions) {
					if (handlers.has(subOption.name)) {
						handlers.get(subOption.name)!.set(option.name, option.handle!);
						continue;
					}

					handlers.set(
						subOption.name,
						new Map([[option.name, option.handle!]]),
					);
				}
			}

			for (const [subOption, options] of handlers.entries()) {
				this.interactions.autocomplete(
					command.name,
					subOption,
					(interaction) =>
						options.get(interaction.subCommand!)!.call(this, interaction),
				);
			}
		}

		const promises = [];

		const guilds = await this.guilds.array();
		for (const guild of guilds) {
			promises.push(this.synchroniseGuildCommands(guild, commands));
		}

		return Promise.all(promises);
	}

	manageCommand(command: Command): void {
		this.interactions.handle(
			command.name,
			command.handle!,
			ApplicationCommandType.CHAT_INPUT,
		);
	}

	setupControllers(guild: Guild): void {
		Client.logging.set(guild.id, new LoggingController(guild));
		Client.music.set(guild.id, new MusicController(guild));
	}

	setupServices(): void {
		for (const startService of services) {
			startService(this);
		}
	}

	/**
	 * Synchronises a guild's slash commands with slash commands defined in the
	 * source code of the application to ensure that slash commands are always
	 * up-to-date.
	 *
	 * @param guild - The guild whose slash commands to synchronise.
	 * @param commands - The source code slash commands.
	 */
	synchroniseGuildCommands(
		guild: Guild,
		commands: Command[],
	): Promise<unknown> {
		const applicationCommands = [];
		for (const command of commands) {
			applicationCommands.push(createApplicationCommand(command));
		}

		// TODO(vxern): Add default permissions once Harmony supports them.
		/*
		const guildCommands = await guild.commands.bulkEdit(applicationCommands);

		const commandPermissions = await createPermissions(
			guild,
			guildCommands,
			commands,
		);
		return guild.commands.permissions.bulkEdit(commandPermissions);
    */

		return guild.commands.bulkEdit(applicationCommands);
	}

	/**
	 * Checks if the guild is part of the language network.
	 *
	 * @param guild - The guild whose status to check.
	 * @return The result of the check.
	 */
	static isManagedGuild(guild: Guild): boolean {
		return guildName.test(guild.name!);
	}

	/**
	 * Concatenates the command's name, subcommand group and subcommand into a
	 * single string representing the whole command name.
	 *
	 * @param command - The interaction whose command to display.
	 * @returns The full command name.
	 */
	static displayCommand(command: ApplicationCommandInteraction): string {
		const parts = [command.name, command.subCommandGroup, command.subCommand];
		return parts.filter((part) => part).join(' ');
	}

	/**
	 * Returns the language of the guild.
	 *
	 * @param guild - The guild whose language to return.
	 * @returns The guild's language.
	 */
	static getLanguage(guild: Guild): string {
		return Client.languages.get(guild.id)!;
	}
}

/**
 * Describes the handler of an interaction.
 *
 * @param interaction - The interaction to be handled.
 */
type InteractionHandler = (
	interaction: ApplicationCommandInteraction | AutocompleteInteraction,
) => unknown;

export { Client };
export type { InteractionHandler };
