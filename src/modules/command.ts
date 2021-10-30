import {
  ApplicationCommand,
  ApplicationCommandInteraction,
  ApplicationCommandOptionType,
  InteractionResponseType,
} from "../../deps.ts";
import { areOptionsIdentical, Option } from "./option.ts";

const noneAvailable = "No information available.";

type InteractionHandler = (
  interaction: ApplicationCommandInteraction,
) => Promise<ApplicationCommandInteraction>;

interface Command {
  name: string;
  description: string;
  options?: Option[];
  handle?: InteractionHandler;
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
  const command = commands[0];
  command.options = Array<Option>().concat(
    ...commands.map((command) => command.options ?? []),
  );
  return command;
}

function areCommandsIdentical(
  existent: ApplicationCommand,
  introduced: Command,
): boolean {
  const equalities = [
    existent.name === introduced.name,
    existent.description === introduced.description,
    areOptionsIdentical(existent.options, introduced.options),
  ];
  return equalities.every((x) => x);
}

function constructHandler(
  command: Command,
): InteractionHandler {
  if (command.handle) return command.handle;
  if (!command.options) return unimplemented;

  const handlers = new Map<
    string | undefined,
    Map<string | undefined, InteractionHandler>
  >([[undefined, new Map()]]);
  for (const option of command.options) {
    switch (option.type) {
      case ApplicationCommandOptionType.SUB_COMMAND_GROUP:
        handlers.set(
          option.name,
          new Map(
            option.options!.map((
              option,
            ) => [option.name, option.handle || unimplemented]),
          ),
        );
        break;
      case ApplicationCommandOptionType.SUB_COMMAND:
        const commandMap = handlers.get(undefined)!;
        commandMap.set(option.name, option.handle || unimplemented);
        break;
    }
  }
  return (interaction) =>
    handlers.get(interaction.subCommandGroup)!.get(interaction.subCommand)!(
      interaction,
    );
}

export {
  areCommandsIdentical,
  constructHandler,
  mergeCommands,
  noneAvailable,
  unimplemented,
};
export type { Command, InteractionHandler };
