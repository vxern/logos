import { Command, unimplemented } from "../../command.ts";
import { user } from "../../parameters.ts";
import { reason } from "../parameters.ts";

const command: Command = {
  name: "kick",
  description: "Kicks a user from the server.",
  options: [user, reason],
  handle: unimplemented,
};

export default command;
