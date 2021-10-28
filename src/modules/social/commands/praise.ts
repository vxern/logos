import { Command, unimplemented } from "../../command.ts";
import { user } from "../../parameters.ts";

const command: Command = {
  name: "praise",
  description: "Praises a user for their contribution.",
  options: [user],
  execute: unimplemented,
};

export default command;
