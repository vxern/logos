import { Client as DiscordClient, colors, event } from "../deps.ts";
import modules from "./modules/modules.ts";

class Client extends DiscordClient {
  @event()
  async ready() {
    const guilds = await this.guilds.array();
    console.info(
      colors.cyan(`Guilds member of: ${
        guilds.map((guild) => guild.name).join(", ")
      }`),
    );

    console.info(colors.cyan(`Creating commands...`));
    const commands = modules.commands;
    for (const command of commands) {
      await this.interactions.commands
        .create({
          type: "CHAT_INPUT",
          name: command.name,
          description: command.description ?? "No information available.",
          options: command.options,
        }, "892167505194414111");
      this.interactions.handle(command.name, (interaction) => {
        console.info(
          colors.magenta(
            `Handling interaction '${interaction.name}' from ${interaction.user.username}...`,
          ),
        );
        command.execute(interaction);
      }, "CHAT_INPUT");
    }
    console.info(colors.green(`Created ${commands.length} commands.`));
  }
}

export { Client };
