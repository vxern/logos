import { Command } from "../../../commands/command.ts";
import { OptionType } from "../../../commands/option.ts";

const command: Command = {
  name: "information",
  options: [{
    name: "bot",
    description: "Displays information about the bot.",
    type: OptionType.SUB_COMMAND,
  }, {
    name: "server",
    description: "Displays information about the server.",
    type: OptionType.SUB_COMMAND,
  }, {
    name: "myself",
    description: "Displays information about the user.",
    type: OptionType.SUB_COMMAND,
  }],
};

export default command;
