import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "unskip",
  description: "Plays the last played song.",
  execute: unimplemented,
};

export default command;
