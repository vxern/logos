import {
  ApplicationCommandPartial,
  Client as DiscordClient,
  colors,
  event,
} from "../deps.ts";
import { areCommandsIdentical } from "./modules/command.ts";
import modules from "./modules/modules.ts";

class Client extends DiscordClient {
  @event()
  async ready() {
    const guilds = await this.guilds.array();
    console.info(
      colors.cyan(
        `Guilds member of: ${
          colors.bold(guilds.map((guild) => guild.name).join(", "))
        }`,
      ),
    );

    const commands = modules.commands;
    const updates = [];
    for (const guild of guilds) {
      console.info(
        colors.cyan(`Checking commands of ${colors.bold(guild.name!)}...`),
      );
      const guildCommands = (await guild.commands.all()).array();
      for (const command of commands) {
        if (!command.description) {
          command.description = "No information available.";
        }
        const commandPartial: ApplicationCommandPartial = {
          name: command.name,
          description: command.description,
          options: command.options,
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
        if (!areCommandsIdentical(guildCommand, command)) {
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

    console.info(
      colors.cyan(`Assigning handlers to commands...`),
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
        command.execute(interaction);
      }, "CHAT_INPUT");
    }
    console.info(
      colors.green(`Assigned handlers to commands.`),
    );

    Promise.all(updates).then((changes) => {
      console.info(
        colors.green(
          `Finished setting up commands. Commands created or altered: ${changes.length}`,
        ),
      );
    });
  }
}

function bold(target: string): string {
  return `**${target}**`;
}

function code(target: string): string {
  return "`" + target + "`";
}

function codeMultiline(target: string): string {
  return "```" + target + "```";
}

export { bold, Client, code, codeMultiline };
