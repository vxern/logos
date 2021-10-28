import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "list",
  options: [{
    type: "SUB_COMMAND",
    name: "roles",
    description: "Lists available roles.",
  }],
  execute: unimplemented,
};

export default command;
