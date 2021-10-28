import {
  ApplicationCommandInteraction,
  ApplicationCommandOption,
  InteractionResponseType,
} from "../../deps.ts";

interface Command {
  name: string;
  description?: string;
  options?: ApplicationCommandOption[];
  execute: (
    interaction: ApplicationCommandInteraction,
  ) => Promise<ApplicationCommandInteraction>;
}

function unimplemented(
  interaction: ApplicationCommandInteraction,
): Promise<ApplicationCommandInteraction> {
  return interaction.respond({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    content: "This command is merely a placeholder.",
    ephemeral: true,
  });
}

function mergeCommands(...commands: Command[]): Command {
  const executeRouter = Object.fromEntries(
    commands.map((command) => [command.name, command.execute]),
  );
  const command = commands.reduce((command, current) => {
    if (current.options) {
      command.options = Array<ApplicationCommandOption>().concat(
        command.options!,
        current.options,
      );
    }
    return command;
  });
  command.execute = (interaction) =>
    executeRouter[interaction.name](interaction);
  return command;
}

export { mergeCommands, unimplemented };
export type { Command };
