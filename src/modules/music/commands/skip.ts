import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "skip",
  description: "Skips the currently playing song.",
  execute: unimplemented,
};

export default command;
