import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "pause",
  availability: Availability.MEMBERS,
  description: "Pauses the currently playing song.",
};

export default command;
