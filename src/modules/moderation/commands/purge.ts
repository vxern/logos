import { Command } from "../../../commands/command.ts";
import { elements } from "../../parameters.ts";

const command: Command = {
  name: "purge",
  description: "Deletes a number of messages from a channel.",
  options: [elements],
};

export default command;
