import { Command, unimplemented } from "../../command.ts";
import { elements } from "../../parameters.ts";

const command: Command = {
  name: "purge",
  description: "Deletes a number of messages from a channel.",
  options: [elements],
  handle: unimplemented,
};

export default command;
