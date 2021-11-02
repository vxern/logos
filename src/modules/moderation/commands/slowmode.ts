import { Command } from "../../../commands/command.ts";
import { duration } from "../parameters.ts";

const command: Command = {
  name: "slowmode",
  description: "Enables slowmode in a channel.",
  options: [duration],
};

export default command;
