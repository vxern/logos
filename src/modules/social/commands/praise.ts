import { Command } from "../../../commands/command.ts";
import { user } from "../../parameters.ts";

const command: Command = {
  name: "praise",
  description: "Praises a user for their contribution.",
  options: [user],
};

export default command;
