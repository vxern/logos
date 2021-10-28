import { ApplicationCommandOption } from "../../deps.ts";
import { Command, mergeCommands } from "./command.ts";
import information from "./information/information.ts";
import moderation from "./moderation/moderation.ts";
import music from "./music/music.ts";
import roles from "./roles/roles.ts";
import secret from "./secret/secret.ts";
import social from "./social/social.ts";

const modules: Record<string, Command>[] = [
  information,
  moderation,
  music,
  roles,
  secret,
  social,
];

const commands = mergeModules(modules);

function mergeModules(modules: Record<string, Command>[]): Command[] {
  return Array<Command>().concat(
    ...modules.map((module) => Object.values(module)),
  ).filter((command, index, array) => {
    const indexOfFirst = array.findIndex((first) =>
      first.name === command.name
    );
    if (indexOfFirst !== index) {
      array[indexOfFirst] = mergeCommands(array[indexOfFirst], command);
      return false;
    }
    return true;
  });
}

export default { modules: modules, commands: commands };
