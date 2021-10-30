import { ApplicationCommandOptionType } from "../../../../deps.ts";
import { Command, noneAvailable, unimplemented } from "../../command.ts";

const command: Command = {
  name: "list",
  description: noneAvailable,
  options: [{
    name: "reprimands",
    description: "Lists a user's reprimands.",
    type: ApplicationCommandOptionType.SUB_COMMAND,
    handle: unimplemented,
  }],
};

export default command;
