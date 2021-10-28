import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "list",
  options: [{
    type: "SUB_COMMAND",
    name: "modules",
    description: "Lists installed modules.",
  }, {
    type: "SUB_COMMAND",
    name: "commands",
    description: "Lists commands within a module.",
    options: [{
      type: "STRING",
      name: "module",
      description: "The name of the module.",
      required: true,
    }],
  }],
  execute: unimplemented,
};

export default command;
