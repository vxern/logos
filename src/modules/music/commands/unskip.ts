import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "unskip",
  description: "Plays the last played song.",
  handle: unimplemented,
};

export default command;
