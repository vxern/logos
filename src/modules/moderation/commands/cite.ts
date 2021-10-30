import { Command, unimplemented } from "../../command.ts";
import { index } from "../../parameters.ts";

const command: Command = {
  name: "cite",
  description: "Cites a server rule.",
  options: [index],
  handle: unimplemented,
};

export default command;
