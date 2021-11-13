import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "queue",
  availability: Availability.MEMBERS,
  description: "Displays the list of queued songs.",
};

export default command;
