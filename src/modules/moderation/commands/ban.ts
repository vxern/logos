import { Command } from "../../../commands/command.ts";
import { user } from "../../parameters.ts";
import { reason } from "../parameters.ts";

const command: Command = {
  name: "ban",
  description: "Bans a user from the server, making them unable to rejoin it.",
  options: [user, reason],
};

export default command;
