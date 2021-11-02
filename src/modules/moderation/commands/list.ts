import { Command } from "../../../commands/command.ts";
import { OptionType } from "../../../commands/option.ts";

const command: Command = {
  name: "list",
  options: [{
    name: "reprimands",
    description: "Lists a user's reprimands.",
    type: OptionType.SUB_COMMAND,
  }],
};

export default command;
