import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "skip",
  description: "Skips the currently playing song.",
  handle: unimplemented,
};

export default command;
