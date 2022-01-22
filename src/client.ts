import {
  ApplicationCommandInteraction,
  ApplicationCommandType,
  Client as DiscordClient,
  Collection,
  event,
  Guild,
  Intents,
} from "../deps.ts";
import { Node } from "https://deno.land/x/lavadeno@3.2.2/mod.ts";
import {
  Command,
  createApplicationCommand,
  createPermissions,
  unifyHandlers,
} from "./commands/command.ts";
import modules from "./modules/modules.ts";
import services from "./modules/services.ts";
import { MusicController } from "./modules/music/controller.ts";

const guildName = new RegExp("^Learn ([A-Z][a-z]*)$");

/** The core of the application, used for interacting with the Discord API. */
class Client extends DiscordClient {
  static node: Node;

  static readonly languages: Collection<string, string> = new Collection();
  static readonly music: Collection<string, MusicController> = new Collection();

  constructor() {
    super({
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
    Client.node = new Node({
      connection: {
        host: Deno.env.get("LAVALINK_HOST")!,
        port: Number(Deno.env.get("LAVALINK_PORT")!),
        password: Deno.env.get("LAVALINK_PASSWORD")!,
      },
      sendGatewayPayload: (_, payload) => this.gateway.send(payload),
    });
    await Client.node.connect(BigInt(this.user!.id));

    const promises = [
      this.setupGuilds(),
      this.setupCommands(),
      this.setupServices(),
    ];

    await Promise.all(promises);
    const now = Date.now();
    console.log(`Setup took ${now - then}ms`);
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

      this.setupControllers(guild);
    }

    return Promise.all(promises);
  }

  manageGuild(guild: Guild): void {
    const language = guildName.exec(guild.name!)![1].toLowerCase();

    Client.languages.set(guild.id, language);
  }

  async setupCommands(): Promise<unknown> {
    this.interactions.on('interactionError', console.error);
    
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
      command.handle!,
      ApplicationCommandType.CHAT_INPUT,
    );
  }

  setupControllers(guild: Guild): void {
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
   * Checks if the guild is part of the language network.
   *
   * @param guild - The guild whose status to check.
   * @return The result of the check.
   */
  static isManagedGuild(guild: Guild): boolean {
    const equalities = [
      guildName.test(guild.name!),
      // guild.ownerID === configuration.guilds.owner.id,
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
