import { Command, unimplemented } from "../../command.ts";
import { user } from "../../parameters.ts";
import { reason } from "../parameters.ts";

const command: Command = {
  name: "reprimand",
  description: "Reprimands the user.",
  options: [user, reason],
  execute: unimplemented,
};

export default command;
