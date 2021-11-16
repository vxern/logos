import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import { user } from "../../parameters.ts";
import { reason } from "../parameters.ts";

const command: Command = {
  name: "unban",
  availability: Availability.MODERATORS,
  description: "Unbans a user, allowing them to join the server again.",
  options: [user, reason],
};

export default command;
