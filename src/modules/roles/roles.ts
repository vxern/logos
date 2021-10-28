import { Command } from "../command.ts";
import assign from "./commands/assign.ts";
import list from "./commands/list.ts";
import unassign from "./commands/unassign.ts";

const commands: Record<string, Command> = {
  assign,
  list,
  unassign,
};

export default commands;
