import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "unpause",
  description: "Unpauses the currently playing song.",
  handle: unimplemented,
};

export default command;
