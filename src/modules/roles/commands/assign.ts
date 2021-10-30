import { Command, unimplemented } from "../../command.ts";
import { role } from "../parameters.ts";

const command: Command = {
  name: "assign",
  description: "Assigns a role.",
  options: [role],
  handle: unimplemented,
};

export default command;
