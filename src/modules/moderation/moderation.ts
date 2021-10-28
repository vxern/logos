import { Command } from "../command.ts";
import ban from "./commands/ban.ts";
import cite from "./commands/cite.ts";
import kick from "./commands/kick.ts";
import mute from "./commands/mute.ts";
import pardon from "./commands/pardon.ts";
import purge from "./commands/purge.ts";
import reprimand from "./commands/reprimand.ts";
import slowmode from "./commands/slowmode.ts";
import unban from "./commands/unban.ts";
import unmute from "./commands/unmute.ts";

const commands: Record<string, Command> = {
  ban,
  cite,
  kick,
  mute,
  pardon,
  purge,
  slowmode,
  unban,
  unmute,
  reprimand,
};

export default commands;
