import { Command } from "../command.ts";
import praise from "./commands/praise.ts";
import profile from "./commands/praise.ts";

const commands: Record<string, Command> = {
  praise,
  profile,
};

export default commands;
