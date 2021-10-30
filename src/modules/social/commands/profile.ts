import { Command, unimplemented } from "../../command.ts";
import { user } from "../../parameters.ts";

const command: Command = {
  name: "profile",
  description: "Displays the user's profile.",
  options: [user],
  handle: unimplemented,
};

export default command;
