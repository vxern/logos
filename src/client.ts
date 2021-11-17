import {
  ApplicationCommandInteraction,
  ApplicationCommandType,
  Client as DiscordClient,
  event,
  Guild,
  Intents,
} from "../deps.ts";
import {
  Command,
  createApplicationCommand,
  createPermissions,
  unifyHandlers,
} from "./commands/command.ts";
import modules from "./modules/modules.ts";
import configuration from "./configuration.ts";
import services from "./services/service.ts";

/** The core of the application, used for interacting with the Discord API. */
class Client extends DiscordClient {
  public static readonly languages: Map<string, string> = new Map();

  constructor() {
    super({
      id: Deno.env.get("APPLICATION_ID")!,
      token: Deno.env.get("DISCORD_SECRET")!,
      intents: Intents.GuildMembers,
      forceNewSession: false,
      presence: {
        activity: {
          name: "Deno",
          type: "PLAYING",
        },
      },
      canary: true,
      clientProperties: {
        os: "linux",
        browser: "cards",
        device: "cards",
      },
      enableSlash: true,
      disableEnvToken: true,
      fetchGatewayInfo: true,
      compress: true,
      messageCacheMax: 500,
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
  protected async ready() {
    const then = Date.now();
    const promises = [
      this.setupGuilds(),
      this.setupCommands(),
      this.setupServices(),
    ];

    await Promise.all(promises);
    const now = Date.now();
    console.log(`Setup took ${now - then}ms`);

    this.notifyReady();
  }

  async setupGuilds(): Promise<unknown> {
    const promises: Promise<unknown>[] = [];

    const guilds = await this.guilds.array();
    for (const guild of guilds) {
      promises.push(
        guild.roles.fetchAll(),
        guild.members.fetchList(),
      );

      if (Client.isManagedGuild(guild)) {
        this.manageGuild(guild);
      }
    }

    return Promise.all(promises);
  }

  manageGuild(guild: Guild): void {
    const language = configuration.guilds.name.exec(guild.name!)![1]
      .toLowerCase();

    Client.languages.set(guild.id, language);
  }

  async setupCommands(): Promise<unknown> {
    const commands = modules.commands;
    for (const command of commands) {
      command.handle = unifyHandlers(command);
      this.manageCommand(command);
    }

    const promises = [];

    const guilds = await this.guilds.array();
    for (const guild of guilds) {
      promises.push(this.synchroniseGuildCommands(guild, commands));
    }

    return Promise.all(promises);
  }

  manageCommand(command: Command) {
    this.interactions.handle(
      command.name,
      (interaction) => command.handle!(interaction),
      ApplicationCommandType.CHAT_INPUT,
    );
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
  async synchroniseGuildCommands(
    guild: Guild,
    commands: Command[],
  ): Promise<unknown> {
    const applicationCommands = [];
    for (const command of commands) {
      applicationCommands.push(createApplicationCommand(command));
    }
    const guildCommands = await guild.commands.bulkEdit(applicationCommands);

    const commandPermissions = await createPermissions(
      guild,
      guildCommands,
      commands,
    );
    return guild.commands.permissions.bulkEdit(commandPermissions);
  }

  /**
   * Writes a message to the owner, notifying them of the bot being operational.
   */
  async notifyReady(): Promise<void> {
    const directMessageChannel = await this.createDM(
      configuration.guilds.owner.id,
    );
    directMessageChannel.send({
      embeds: [{
        title: "Ready",
        description: "The bot is up and working.",
        thumbnail: {
          url: this.user!.avatarURL(),
          height: 64,
          width: 64,
        },
      }],
    });
  }

  /**
   * Checks if the guild is part of the language network.
   *
   * @param guild - The guild whose status to check.
   * @return The result of the check.
   */
  static isManagedGuild(guild: Guild): boolean {
    const equalities = [
      configuration.guilds.name.test(guild.name!),
      guild.ownerID === configuration.guilds.owner.id,
    ];
    return equalities.every((x) => x);
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
    return parts.filter((part) => part).join(" ");
  }

  /**
   * Returns the language of the guild.
   *
   * @param guild - The guild whose language to return.
   * @returns The guild's language.
   */
  static getLanguage(guild: Guild) {
    return Client.languages.get(guild.id);
  }
}

/**
 * Describes the handler of an interaction.
 *
 * @param interaction - The interaction to be handled.
 */
type InteractionHandler = (
  interaction: ApplicationCommandInteraction,
) => unknown;

export { Client };
export type { InteractionHandler };
