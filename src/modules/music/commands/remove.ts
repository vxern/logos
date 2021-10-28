import { Command, unimplemented } from "../../command.ts";
import { index, title } from "../parameters.ts";

const command: Command = {
  name: "remove",
  description: "Removes a song from the queue.",
  options: [index, title],
  execute: unimplemented,
};

export default command;
