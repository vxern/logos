import {
  ApplicationCommand,
  ApplicationCommandInteraction,
  ApplicationCommandOption,
  ApplicationCommandPartial,
  ApplicationCommandType,
  Client as DiscordClient,
  colors,
  event,
  Guild,
} from "../deps.ts";
import { Command, unifyHandlers } from "./commands/command.ts";
import modules from "./modules/modules.ts";
import config from "./config.ts";
import { areEqual } from "./utils.ts";

/** The core of the application, used for interacting with the Discord API. */
class Client extends DiscordClient {
  public static readonly managed: Map<string, string> = new Map();

  /**
   * Called when {@link Client} is authenticated by Discord, and is ready to use
   * the API.
   *
   * @remarks
   * This function should __not__ be called externally.
   */
  @event()
  protected async ready() {
    const guilds = await this.guilds.array();
    for (const guild of guilds) {
      if (Client.isManagedGuild(guild)) {
        Client.managed.set(
          guild.id,
          config.guilds.name.exec(guild.name!)![1].toLowerCase(),
        );
      }
      await guild.roles.fetchAll();
    }

    const commands = modules.commands;

    console.info(
      colors.cyan("Constructing handlers for commands with subcommands..."),
    );
    for (const command of commands) {
      command.handle = unifyHandlers(command);
    }

    console.info(
      colors.cyan("Assigning handlers to commands..."),
    );
    for (const command of commands) {
      this.interactions.handle(command.name, (interaction) => {
        console.info(
          colors.magenta(
            `Handling interaction '${
              Client.displayCommand(interaction)
            }' from ${colors.bold(interaction.user.tag)} on ${
              colors.bold(interaction.guild!.name!)
            }...`,
          ),
        );
        command.handle!(interaction);
      }, ApplicationCommandType.CHAT_INPUT);
    }

    for (const guild of guilds) {
      await this.synchroniseGuildCommands(guild, commands);
    }

    this.setPresence({
      activity: {
        name: "Deno",
        type: "PLAYING",
      },
    });

    this.notifyReady();
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
  ): Promise<void> {
    console.info(
      colors.cyan(`Synchronising commands of ${colors.bold(guild.name!)}...`),
    );

    const guildCommands = (await guild.commands.all()).array();
    const added = [];
    const altered = [];
    for (const command of commands) {
      const commandPartial: ApplicationCommandPartial = {
        name: command.name,
        description: command.description,
        options: command.options as ApplicationCommandOption[],
        type: ApplicationCommandType.CHAT_INPUT,
      };

      const guildCommand = guildCommands.splice(
        guildCommands.findIndex((guildCommand) =>
          guildCommand.name === command.name
        ),
        1,
      )[0];

      if (!guildCommand) {
        this.interactions.commands.create(commandPartial, guild.id);
        added.push(command.name);
        continue;
      }

      if (!areEqual(guildCommand, command)) {
        this.interactions.commands.edit(
          guildCommand.id,
          commandPartial,
          guild.id,
        );
        altered.push(command.name);
      }
    }
    if (added.length !== 0) {
      console.info(colors.green(`+ ${altered}`));
    }
    if (altered.length !== 0) {
      console.info(colors.yellow(`/ ${altered}`));
    }

    for (const guildCommand of guildCommands) {
      this.interactions.commands.delete(
        guildCommand.id,
        guild.id,
      );
    }
    const removed = guildCommands
      .map((guildCommand) => guildCommand.name)
      .join(", ");
    if (removed.length !== 0) {
      console.info(colors.red(`- ${removed}`));
    }
  }

  /**
   * Writes a message to the owner, notifying them of the bot being operational.
   */
  async notifyReady(): Promise<void> {
    const directMessageChannel = await this.createDM(config.guilds.owner.id);
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
      config.guilds.name.test(guild.name!),
      guild.ownerID === config.guilds.owner.id,
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
}

/**
 * Describes the handler of an interaction.
 *
 * @param interaction - The interaction to be handled.
 */
type InteractionHandler = (
  interaction: ApplicationCommandInteraction,
) => unknown;

/**
 * Modifies a string of text to appear italicised within Discord.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function italic(target: string): string {
  return `*${target}*`;
}

/**
 * Modifies a string of text to appear bold within Discord.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function bold(target: string): string {
  return `**${target}**`;
}

/**
 * Modifies a string of text to appear underlined within Discord.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function underlined(target: string): string {
  return `__${target}__`;
}

/**
 * Modifies a string of text to appear within Discord as an embedded code block.
 *
 * @param target - String of text to format.
 * @returns The formatted string of text.
 */
function code(target: string): string {
  return "`" + target + "`";
}

/**
 * Modifies a string of text to appear within Discord as a multi-line code block
 * which expands to fill up entire rows and columns within a text box.
 *
 * @param target - String of text to format.
 */
function codeMultiline(target: string): string {
  return "```" + target + "```";
}

export { bold, Client, code, codeMultiline, italic, underlined };
export type { InteractionHandler };
