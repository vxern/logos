import { Command } from "../../../commands/command.ts";
import { index, title } from "../parameters.ts";

const command: Command = {
  name: "remove",
  description: "Removes a song from the queue.",
  options: [index, title],
};

export default command;
