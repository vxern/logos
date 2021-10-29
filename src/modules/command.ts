import {
  ApplicationCommand,
  ApplicationCommandInteraction,
  ApplicationCommandOption,
  ApplicationCommandOptionType,
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

function areOptionsIdentical(
  existent: ApplicationCommandOption | ApplicationCommandOption[] | undefined,
  introduced: ApplicationCommandOption | ApplicationCommandOption[] | undefined,
): boolean {
  const existentIsEmpty = Array.isArray(existent)
    ? (existent as ApplicationCommandOption[]).length === 0
    : false;
  // If `existent` is empty or undefined and `introduced` is `undefined`
  if ((!existent || existentIsEmpty) && !introduced) {
    return true;
  }
  // If exclusively `existent` is empty or undefined or if exclusively `introduced` is `undefined`
  if (!(existent && introduced)) {
    return false;
  }
  if (Array.isArray(existent) || Array.isArray(introduced)) {
    const existentOptions = existent as ApplicationCommandOption[];
    const introducedOptions = introduced as ApplicationCommandOption[];
    return existentOptions.length === introducedOptions.length &&
      existentOptions.every((option, index) =>
        areOptionsIdentical(option, introducedOptions[index])
      );
  }
  const equalities = [
    existent!.name === introduced.name,
    existent!.description === introduced.description,
    Object.values(ApplicationCommandOptionType).at(
      existent!.type as number - 1,
    ) === introduced.type,
    existent!.required === (introduced.required ? true : undefined),
    existent!.default === introduced.default,
    areOptionsIdentical(existent!.options, introduced.options),
  ];
  return equalities.every((x) => x);
}

export { areCommandsIdentical, mergeCommands, unimplemented };
export type { Command };
