import {
  Command,
  mergeCommandOptions,
  unimplemented,
} from "../commands/command.ts";
import { Option, OptionType } from "../commands/option.ts";
import config from "../config.ts";
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
  return supplyMissingProperties(commands.filter((command, index, array) => {
    const firstIndex = array.findIndex((first) => first.name === command.name);
    if (firstIndex !== index) {
      array[firstIndex] = mergeCommandOptions([array[firstIndex], command]);
      return false;
    }
    return true;
  }));
}

/**
 * Supplies properties which may be undefined with default values as Discord
 * requires them to be truthy.
 *
 * @param elements - The array of {@link Command}s or {@link Option}s to whom to
 * supply missing properties.
 * @returns The modified array of {@link Command}s or {@link Option}s.
 */
function supplyMissingProperties<T extends Command | Option>(
  elements: T[],
): T[] {
  for (const element of elements) {
    element.description ??= config.failsafes.interactions.description;
    switch (element.type) {
      // An object represented by the Command interface will __not__ have the
      // 'type' property assigned, therefore an [element.type] of `undefined`
      // implies [element] is a command.
      case undefined:
        if (element.options && element.options.length > 0) break;
      // Only options of type [OptionType.SUB_COMMAND] may have handlers.
      case OptionType.SUB_COMMAND:
        if (!element.handle) {
          element.handle = unimplemented;
        }
    }
    if (!element.options) continue;
    supplyMissingProperties((element as Option).options!);
  }
  return elements;
}

export default { modules: modules, commands: commands };
