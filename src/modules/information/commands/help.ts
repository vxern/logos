import { Command, unimplemented } from "../../command.ts";

const command: Command = {
  name: "help",
  description: "Displays helpful information on how to use the bot.",
  execute: unimplemented,
};

export default command;
