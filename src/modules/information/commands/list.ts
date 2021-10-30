import { ApplicationCommandOptionType } from "../../../../deps.ts";
import { Command, noneAvailable, unimplemented } from "../../command.ts";

const command: Command = {
  name: "list",
  description: noneAvailable,
  options: [{
    name: "modules",
    description: "Lists installed modules.",
    handle: unimplemented,
    type: ApplicationCommandOptionType.SUB_COMMAND,
  }, {
    name: "commands",
    description: "Lists commands within a module.",
    handle: unimplemented,
    type: ApplicationCommandOptionType.SUB_COMMAND,
    options: [{
      name: "module",
      description: "The name of the module.",
      required: true,
      type: ApplicationCommandOptionType.STRING,
    }],
  }],
};

export default command;
