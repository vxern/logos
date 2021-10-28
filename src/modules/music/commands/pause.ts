import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "pause",
  description: "Pauses the currently playing song.",
  execute: unimplemented,
};

export default command;
