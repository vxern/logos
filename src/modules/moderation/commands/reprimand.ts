import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import { user } from "../../parameters.ts";
import { reason } from "../parameters.ts";

const command: Command = {
  name: "reprimand",
  availability: Availability.GUIDES,
  description: "Reprimands the user.",
  options: [user, reason],
};

export default command;
