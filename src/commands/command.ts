import {
  _,
  ApplicationCommandInteraction,
  ApplicationCommandPartialBase,
  InteractionResponseType,
} from "../../deps.ts";
import { InteractionHandler } from "../client.ts";
import { Option, OptionType } from "./option.ts";

/** An application command with an optional handler for its execution. */
interface Command extends ApplicationCommandPartialBase<Option> {
  /** The function to be executed when this command is selected. */
  handle?: InteractionHandler;
}

/**
 * A handler for interactions which are missing a handler.
 *
 * @param interaction The interaction to be handled.
 */
function unimplemented(
  interaction: ApplicationCommandInteraction,
): void {
  interaction.respond({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    embeds: [{
      title: "Unimplemented",
      description: "This command is missing a handler.",
    }],
    ephemeral: true,
  });
}

/**
 * Merges multiple {@link Command}s' {@link Option}s into a single array.
 *
 * @param commands - The commands whose options to merge.
 * @returns The merged command.
 */
function mergeCommandOptions(commands: Command[]): Command {
  const command = commands[0];
  command.options = Array<Option>().concat(
    ...commands.map((command) => command.options ?? []),
  );
  return command;
}

/**
 * Unifies the command's option handlers into a single handler.
 *
 * @param command - The command whose handlers to unify.
 * @returns The unified handler.
 */
function unifyHandlers(command: Command): InteractionHandler {
  if (command.handle) return command.handle;
  if (!command.options) return unimplemented;

  const handlers = new Map<
    string | undefined,
    Map<string | undefined, InteractionHandler>
  >([[undefined, new Map()]]);
  for (const option of command.options) {
    switch (option.type) {
      case OptionType.SUB_COMMAND_GROUP: {
        handlers.set(
          option.name,
          new Map(
            option.options!.map((
              option,
            ) => [option.name, option.handle || unimplemented]),
          ),
        );
        break;
      }
      case OptionType.SUB_COMMAND: {
        const commandMap = handlers.get(undefined)!;
        commandMap.set(option.name, option.handle || unimplemented);
        break;
      }
    }
  }
  return (interaction) =>
    handlers.get(interaction.subCommandGroup)!.get(interaction.subCommand)!(
      interaction,
    );
}

export { mergeCommandOptions, unifyHandlers, unimplemented };
export type { Command };
