import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "skip",
  availability: Availability.MEMBERS,
  description: "Skips the currently playing song.",
};

export default command;
