import { Command, unimplemented } from "../../command.ts";
import { role } from "../parameters.ts";

const command: Command = {
  name: "assign",
  description: "Assigns a role.",
  options: [role],
  execute: unimplemented,
};

export default command;
