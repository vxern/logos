import { Command } from "../../../commands/command.ts";
import { by, to } from "../parameters.ts";

const command: Command = {
  name: "forward",
  description: "Fast-forwards the currently playing song.",
  options: [by, to],
};

export default command;
