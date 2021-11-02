import { Command } from "../../../commands/command.ts";
import { user } from "../../parameters.ts";

const command: Command = {
  name: "profile",
  description: "Displays the user's profile.",
  options: [user],
};

export default command;
