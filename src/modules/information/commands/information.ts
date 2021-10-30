import { ApplicationCommandOptionType } from "../../../../deps.ts";
import { Command, noneAvailable, unimplemented } from "../../command.ts";

const command: Command = {
  name: "information",
  description: noneAvailable,
  options: [{
    name: "bot",
    description: "Displays information about the bot.",
    handle: unimplemented,
    type: ApplicationCommandOptionType.SUB_COMMAND,
  }, {
    name: "server",
    description: "Displays information about the server.",
    handle: unimplemented,
    type: ApplicationCommandOptionType.SUB_COMMAND,
  }, {
    name: "myself",
    description: "Displays information about the user.",
    handle: unimplemented,
    type: ApplicationCommandOptionType.SUB_COMMAND,
  }],
};

export default command;
