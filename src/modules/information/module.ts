import { Command } from "../../commands/command.ts";
// import help from "./commands/help.ts";
import information from "./commands/information.ts";
// import list from "./commands/list.ts";

const commands: Record<string, Command> = {
  // help,
  information,
  // list,
};

export default commands;
