import {
	ApplicationCommandType,
	Client as DiscordClient,
	event,
	Guild,
	Intents,
	lavadeno,
} from '../deps.ts';
import { createApplicationCommand, unifyHandlers } from './commands/command.ts';
import modules from './modules/modules.ts';
import services from './modules/service.ts';
import { LoggingController } from './modules/information/controller.ts';
import { MusicController } from './modules/music/controller.ts';
import { loadComponents } from './modules/language/module.ts';
import { time } from './utils.ts';
import secrets from '../secrets.ts';
import { Database } from './database/database.ts';
import configuration from './configuration.ts';
import { Command, InteractionHandler } from './commands/structs/command.ts';

/** The core of the application, used for interacting with the Discord API. */
class Client extends DiscordClient {
	node!: lavadeno.Node;

	/** Database connection. */
	readonly database: Database = new Database();

	/**
	 * Languages of the guilds managed by this client.
	 *
	 * The keys are guild IDs, and the values are their respective topic language.
	 */
	readonly languages: Map<string, string> = new Map();

	/**
	 * Logging controllers pertaining to the guilds managed by this client.
	 *
	 * The keys are guild IDs, and the values are their respective logging controller.
	 */
	readonly logging: Map<string, LoggingController> = new Map();

	/**
	 * Music controllers pertaining to the guilds managed by this client.
	 *
	 * The keys are guild IDs, and the values are their respective music controller.
	 */
	readonly music: Map<string, MusicController> = new Map();

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
			clientProperties: {
				os: 'vxern#7031',
				browser: 'vxern#7031',
				device: 'vxern#7031',
			},
			disableEnvToken: true,
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
				this.node = new lavadeno.Node({
					connection: secrets.modules.music.lavalink,
					sendGatewayPayload: (_, payload) => this.gateway.send(payload),
				});
				await this.node.connect(BigInt(this.user!.id));

				this.on('raw', (event, payload) => {
					if (
						event === 'VOICE_SERVER_UPDATE' || event === 'VOICE_STATE_UPDATE'
					) {
						this.node.handleVoiceUpdate(payload);
					}
				});

				const promises = [
					this.setupGuilds().then(() => loadComponents(this)),
					this.setupCommands(),
					this.setupServices(),
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
		const guildNameMatch =
			configuration.guilds.nameExpression.exec(guild.name!) || undefined;

		const language = !guildNameMatch
			? 'english'
			: guildNameMatch![1]!.toLowerCase();

		this.languages.set(guild.id, language);
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
					(interaction) => command.handle!(this, interaction),
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
						options.get(interaction.subCommand!)!.call(this, this, interaction),
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
			(interaction) => command.handle!(this, interaction),
			ApplicationCommandType.CHAT_INPUT,
		);
	}

	setupControllers(guild: Guild): void {
		this.logging.set(guild.id, new LoggingController(guild));
		this.music.set(guild.id, new MusicController(this, guild));
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
		return configuration.guilds.nameExpression.test(guild.name!);
	}

	/**
	 * Returns the language of the guild.
	 *
	 * @param guild - The guild whose language to return.
	 * @returns The guild's language.
	 */
	getLanguage(guild: Guild): string {
		return this.languages.get(guild.id)!;
	}
}

export { Client };
