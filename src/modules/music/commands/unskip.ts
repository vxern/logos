import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "unskip",
  availability: Availability.MEMBERS,
  description: "Plays the last played song.",
};

export default command;
