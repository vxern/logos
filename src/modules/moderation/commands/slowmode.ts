import { Command, unimplemented } from "../../command.ts";
import { duration } from "../parameters.ts";

const command: Command = {
  name: "slowmode",
  description: "Enables slowmode in a channel.",
  options: [duration],
  execute: unimplemented,
};

export default command;
