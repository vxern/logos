import { Command } from "../../commands/command.ts";
import resources from "./commands/resources.ts";

const commands: Record<string, Command> = {
  resources,
};

export default commands;
