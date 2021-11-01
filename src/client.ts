import {
  ApplicationCommandInteraction,
  ApplicationCommandOption,
  ApplicationCommandPartial,
  Client as DiscordClient,
  colors,
  event,
} from "../deps.ts";
import { areCommandsEqual, unifyHandlers } from "./commands/command.ts";
import modules from "./modules/modules.ts";

/** The core of the application, used for interacting with the Discord API. */
class Client extends DiscordClient {
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
    console.info(
      colors.cyan(
        `Guilds member of: ${
          colors.bold(guilds.map((guild) => guild.name).join(", "))
        }`,
      ),
    );

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
        if (interaction.user.tag !== "vxern#7031") return;
        console.info(
          colors.magenta(
            `Handling interaction '${interaction.name}' from ${
              colors.bold(interaction.user.username)
            }...`,
          ),
        );
        command.handle!(interaction);
      }, "CHAT_INPUT");
    }

    const updates = [];
    for (const guild of guilds) {
      console.info(
        colors.cyan(`Checking commands of ${colors.bold(guild.name!)}...`),
      );
      const guildCommands = (await guild.commands.all()).array();
      for (const command of commands) {
        const commandPartial: ApplicationCommandPartial = {
          name: command.name,
          description: command.description,
          options: command.options as ApplicationCommandOption[],
          type: "CHAT_INPUT",
        };

        const guildCommand = guildCommands.find((guildCommand) =>
          guildCommand.name === command.name
        );
        if (!guildCommand) {
          console.info(
            colors.cyan(`Creating command ${colors.bold(command.name)}...`),
          );
          updates.push(this.interactions.commands
            .create(commandPartial, guild.id));
          continue;
        }
        if (!areCommandsEqual(guildCommand, command)) {
          console.info(
            colors.cyan(
              `Command ${
                colors.bold(command.name)
              } had been altered. Editing...`,
            ),
          );
          updates.push(this.interactions.commands.edit(
            guildCommand.id,
            commandPartial,
            guild.id,
          ));
        }
      }
    }

    Promise.all(updates).then((changes) => {
      console.info(
        colors.green(
          `Finished setting up commands. Commands created or altered: ${changes.length}`,
        ),
      );
    });
  }
}

/**
 * Describes a handler of an interaction.
 *
 * @param interaction - The interaction to be handled.
 */
type InteractionHandler = (
  interaction: ApplicationCommandInteraction,
) => Promise<unknown>;

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

export { bold, Client, code, codeMultiline, underlined };
export type { InteractionHandler };
