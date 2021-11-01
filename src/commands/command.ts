import {
  _,
  ApplicationCommand,
  ApplicationCommandInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandPartialBase,
  InteractionResponseType,
} from "../../deps.ts";
import { InteractionHandler } from "../client.ts";
import config from "../config.ts";
import { areOptionsEqual, Option } from "./option.ts";

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
async function unimplemented(
  interaction: ApplicationCommandInteraction,
): Promise<void> {
  interaction.respond({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    embeds: [{
      title: "​",
      description: config.failsafes.description,
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
 * Compares an application command on the Discord API with an application
 * command defined on the {@link Client}.
 *
 * @param existent - The existent application command saved in the Discord API.
 * @param introduced - The local application command not yet saved to the API.
 * @returns The result of the comparison.
 */
function areCommandsEqual(
  existent: ApplicationCommand,
  introduced: Command,
): boolean {
  // Check which keys are not equal between the two commands.
  const unequalKeys = _.reduce(
    existent,
    (result: string[], value: any, key: keyof Command) => {
      return _.isEqual(value, introduced[key]) ? result : result.concat(key);
    },
    [],
  ) as string[];
  // If any of the keys apart from 'handle' are unequal, yield `false`.
  return unequalKeys.some((inequality) => inequality !== "handle");
}

/**
 * Unifies the command's option handlers into a single handler.
 *
 * @param command - The command whose handlers to unify.
 * @returns The unified handler.
 */
function unifyHandlers(
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

export { areCommandsEqual, mergeCommandOptions, unifyHandlers, unimplemented };
export type { Command };
