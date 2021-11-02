import { Command } from "../../../commands/command.ts";
import { user } from "../../parameters.ts";
import { reason } from "../parameters.ts";

const command: Command = {
  name: "pardon",
  description: "Pardons the user from the last given reprimand.",
  options: [user, reason],
};

export default command;
