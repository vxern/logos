import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "replay",
  availability: Availability.MEMBERS,
  description: "Begins playing the currently playing song from the start.",
};

export default command;
