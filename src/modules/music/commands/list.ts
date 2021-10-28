import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "list",
  options: [{
    type: "SUB_COMMAND",
    name: "reprimands",
    description: "Lists a user's reprimands.",
  }],
  execute: unimplemented,
};

export default command;
