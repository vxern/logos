import { Command, unimplemented } from "../../command.ts";
import { role } from "../parameters.ts";

const command: Command = {
  name: "unassign",
  description: "Unassigns a role.",
  options: [role],
  execute: unimplemented,
};

export default command;
