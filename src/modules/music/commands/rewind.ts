import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import { by, to } from "../parameters.ts";

const command: Command = {
  name: "rewind",
  availability: Availability.MEMBERS,
  description: "Rewinds the currently playing song.",
  options: [by, to],
};

export default command;
