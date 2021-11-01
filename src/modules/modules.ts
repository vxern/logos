import { Command, mergeCommandOptions } from "../commands/command.ts";
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

/**
 * Combines modules into a single array of {@link Command}s, merging commands
 * with the same names but different options.
 *
 * @param modules - The modules to merge.
 * @returns The array of merged {@link Command}s.
 */
function mergeModules(modules: Record<string, Command>[]): Command[] {
  // Obtain the array of separate commands.
  const commands = Array<Command>().concat(
    ...modules.map((module) => Object.values(module)),
  );
  // Merge commands with the same name.
  return commands.filter((command, index, array) => {
    const firstIndex = array.findIndex((first) => first.name === command.name);
    if (firstIndex !== index) {
      array[firstIndex] = mergeCommandOptions([array[firstIndex], command]);
      return false;
    }
    return true;
  });
}

export default { modules: modules, commands: commands };
