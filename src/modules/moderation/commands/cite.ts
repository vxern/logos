import { Availability } from "../../../commands/availability.ts";
import { Command } from "../../../commands/command.ts";
import { index } from "../../parameters.ts";

const command: Command = {
  name: "cite",
  availability: Availability.MODERATORS,
  description: "Cites a server rule.",
  options: [index],
};

export default command;
