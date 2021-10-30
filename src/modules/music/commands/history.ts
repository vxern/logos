import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "history",
  description: "Displays the list of previously played songs.",
  handle: unimplemented,
};

export default command;
