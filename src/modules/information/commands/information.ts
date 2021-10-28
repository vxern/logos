import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "information",
  options: [{
    type: "SUB_COMMAND",
    name: "bot",
    description: "Displays information about the bot.",
  }, {
    type: "SUB_COMMAND",
    name: "server",
    description: "Displays information about the server.",
  }, {
    type: "SUB_COMMAND",
    name: "myself",
    description: "Displays information about the user.",
  }],
  execute: unimplemented,
};

export default command;
