import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "queue",
  description: "Displays the list of queued songs.",
  handle: unimplemented,
};

export default command;
