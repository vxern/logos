import { ApplicationCommandOptionType } from "../../../../deps.ts";
import { Command, noneAvailable, unimplemented } from "../../command.ts";

const command: Command = {
  name: "list",
  description: noneAvailable,
  options: [{
    name: "roles",
    description: "Lists available roles.",
    type: ApplicationCommandOptionType.SUB_COMMAND,
    handle: unimplemented,
  }],
};

export default command;
