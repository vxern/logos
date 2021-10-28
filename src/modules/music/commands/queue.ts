import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "queue",
  description: "Displays the list of queued songs.",
  execute: unimplemented,
};

export default command;
