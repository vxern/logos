import { ApplicationCommandOption } from "../deps.ts";
import { Command } from "./modules/command.ts";

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

function mergeModules(modules: Record<string, Command>[]): Command[] {
  return Array<Command>().concat(
    ...modules.map((module) => Object.values(module)),
  ).filter((command, index, array) => {
    const indexOfFirst = array.findIndex((first) =>
      first.name === command.name
    );
    if (indexOfFirst !== index) {
      array[indexOfFirst] = mergeCommands(array[indexOfFirst], command);
      return false;
    }
    return true;
  });
}

export { mergeModules };
