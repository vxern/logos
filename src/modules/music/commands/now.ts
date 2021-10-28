import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "now",
  description: "Displays the currently playing song.",
  execute: unimplemented,
};

export default command;
