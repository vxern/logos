import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";

const command: Command = {
  name: "help",
  availability: Availability.EVERYONE,
  description: "Displays helpful information on how to use the bot.",
};

export default command;
