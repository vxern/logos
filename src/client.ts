import {
  ApplicationCommand,
  ApplicationCommandInteraction,
  ApplicationCommandOption,
  ApplicationCommandPartial,
  ApplicationCommandPermission,
  ApplicationCommandPermissionType,
  ApplicationCommandType,
  Client as DiscordClient,
  colors,
  event,
  Guild,
  GuildSlashCommmandPermissionsPartial,
} from "../deps.ts";
import { Command, unifyHandlers } from "./commands/command.ts";
import modules from "./modules/modules.ts";
import config from "./config.ts";
import { areEqual } from "./utils.ts";
import { Availability } from "./commands/availability.ts";
import { resolveGuildRole } from "./modules/roles/structures/role.ts";
import { roles } from "./modules/roles/module.ts";

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
    const altered: [ApplicationCommand, Availability][] = [];
    for (const command of commands) {
      const commandPartial: ApplicationCommandPartial = {
        name: command.name,
        description: command.description,
        options: command.options as ApplicationCommandOption[],
        type: ApplicationCommandType.CHAT_INPUT,
        defaultPermission: false,
      };

      const guildCommand = guildCommands.splice(
        guildCommands.findIndex((guildCommand) =>
          guildCommand.name === command.name
        ),
        1,
      )[0];

      if (!guildCommand) {
        altered.push(
          [
            await this.interactions.commands.create(commandPartial, guild.id),
            command.availability,
          ],
        );
        continue;
      }

      if (!areEqual(guildCommand, command)) {
        altered.push(
          [
            await this.interactions.commands.edit(
              guildCommand.id,
              commandPartial,
              guild.id,
            ),
            command.availability,
          ],
        );
      }
    }

    const commandPermissions: GuildSlashCommmandPermissionsPartial[] = [];
    for (const [command, availability] of altered) {
      const permissions: ApplicationCommandPermission[] = [];
      switch (availability) {
        case Availability.EVERYONE: {
          permissions.push({
            id:
              (await resolveGuildRole({ guild: guild, name: "@everyone" }))!.id,
            type: ApplicationCommandPermissionType.ROLE,
            permission: true,
          });
          break;
        }
        case Availability.MEMBERS: {
          const proficiencies = roles.scopes.global.find((category) =>
            category.name === "Proficiency"
          )!.collection!.list!.map((role) => role.name);
          for (const proficiency of proficiencies) {
            // TODO(vxern): This code will throw an error in a guild without
            // proficiency roles.
            permissions.push({
              id: (await resolveGuildRole({ guild: guild, name: proficiency }))!
                .id,
              type: ApplicationCommandPermissionType.ROLE,
              permission: true,
            });
          }
          break;
        }
        case Availability.GUIDES: {
          permissions.push({
            id:
              (await resolveGuildRole({ guild: guild, name: roles.moderator }))!
                .id,
            type: ApplicationCommandPermissionType.ROLE,
            permission: true,
          });
          break;
        }
        case Availability.OWNER: {
          permissions.push({
            id: config.guilds.owner.id,
            type: ApplicationCommandPermissionType.USER,
            permission: true,
          });
          break;
        }
      }
      commandPermissions.push({
        id: command.id,
        permissions: permissions,
      });
    }
    this.interactions.commands.permissions.bulkEdit(
      commandPermissions,
      guild.id,
    );

    if (altered.length !== 0) {
      console.info(
        colors.yellow(
          `~ ${altered.map(([command, _]) => command.name).join(", ")}`,
        ),
      );
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

export { Client };
export type { InteractionHandler };
