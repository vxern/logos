import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "replay",
  description: "Begins playing the currently playing song from the start.",
  handle: unimplemented,
};

export default command;
