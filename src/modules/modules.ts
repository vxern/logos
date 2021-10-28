import { mergeModules } from "../utils.ts";
import { Command } from "./command.ts";
import information from "./information/information.ts";
import moderation from "./moderation/moderation.ts";
import music from "./music/music.ts";
import roles from "./roles/roles.ts";
import social from "./social/social.ts";

const modules: Record<string, Command>[] = [
  information,
  moderation,
  music,
  roles,
  social,
];

const commands = mergeModules(modules);

export default { modules: modules, commands: commands };
