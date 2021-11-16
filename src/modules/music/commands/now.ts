import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "now",
  availability: Availability.MEMBERS,
  description: "Displays the currently playing song.",
};

export default command;
