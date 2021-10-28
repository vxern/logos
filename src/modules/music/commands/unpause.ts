import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "unpause",
  description: "Unpauses the currently playing song.",
  execute: unimplemented,
};

export default command;
