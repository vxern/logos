import { Command, unimplemented } from "../../command.ts";
import { by, to } from "../parameters.ts";

const command: Command = {
  name: "forward",
  description: "Fast-forwards the currently playing song.",
  options: [by, to],
  handle: unimplemented,
};

export default command;
