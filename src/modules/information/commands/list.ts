import { Command } from "../../../commands/command.ts";
import { OptionType } from "../../../commands/option.ts";

const command: Command = {
  name: "list",
  options: [{
    name: "modules",
    description: "Lists installed modules.",
    type: OptionType.SUB_COMMAND,
  }, {
    name: "commands",
    description: "Lists commands within a module.",
    type: OptionType.SUB_COMMAND,
    options: [{
      name: "module",
      description: "The name of the module.",
      required: true,
      type: OptionType.STRING,
    }],
  }],
};

export default command;
