import { Command, unimplemented } from "../../command.ts";
import { user } from "../../parameters.ts";
import { reason } from "../parameters.ts";

const command: Command = {
  name: "unban",
  description: "Unbans a user, allowing them to join the server again.",
  options: [user, reason],
  execute: unimplemented,
};

export default command;
