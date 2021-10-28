import { Command, unimplemented } from "../../command.ts";
import { user } from "../../parameters.ts";
import { reason } from "../parameters.ts";

const command: Command = {
  name: "unmute",
  description: "Unmutes a user, allowing them to interact on the server again.",
  options: [user, reason],
  execute: unimplemented,
};

export default command;
