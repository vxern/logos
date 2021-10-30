import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "now",
  description: "Displays the currently playing song.",
  handle: unimplemented,
};

export default command;
