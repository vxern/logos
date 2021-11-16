import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "history",
  availability: Availability.MEMBERS,
  description: "Displays the list of previously played songs.",
};

export default command;
