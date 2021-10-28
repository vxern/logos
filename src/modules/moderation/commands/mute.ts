import { Command, unimplemented } from "../../command.ts";
import { user } from "../../parameters.ts";
import { duration, reason } from "../parameters.ts";

const command: Command = {
  name: "mute",
  description: "Mutes a user, making them unable to interact on the server.",
  options: [user, reason, duration],
  execute: unimplemented,
};

export default command;
