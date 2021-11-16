import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "unpause",
  availability: Availability.MEMBERS,
  description: "Unpauses the currently playing song.",
};

export default command;
