import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "history",
  description: "Displays the list of previously played songs.",
  execute: unimplemented,
};

export default command;
