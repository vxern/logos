import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import { elements } from "../../parameters.ts";

const command: Command = {
  name: "purge",
  availability: Availability.MODERATORS,
  description: "Deletes a number of messages from a channel.",
  options: [elements],
};

export default command;
