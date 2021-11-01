import {
  _,
  ApplicationCommandOption,
  ApplicationCommandOptionBase,
} from "../../deps.ts";
import { InteractionHandler } from "../client.ts";

/** A command option with an optional handler for its execution. */
interface Option extends ApplicationCommandOptionBase<Option> {
  /** The function to be executed when this command option is selected. */
  handle?: InteractionHandler;
}

/**
 * Compares a command option defined on the Discord API with a command option
 * defined on the {@link Client}.
 *
 * @param existent - The existent command option saved in the Discord API.
 * @param introduced - The local command option not yet saved to the API.
 * @returns The result of the comparison.
 */
function areOptionsEqual(
  existent: ApplicationCommandOption | undefined,
  introduced: Option | undefined,
): boolean {
  // If both [existent] and [introduced] are `undefined`, raise equality.
  if (!existent && !introduced) {
    return true;
  }
  // If only one of either [existent] or [introduced] is `undefined`, raise
  // inequality.
  if (!(existent && introduced)) {
    return false;
  }
  // Check which keys are not equal between the two options.
  const unequalKeys = _.reduce(
    existent,
    (result: string[], value: any, key: keyof Option) => {
      return _.isEqual(value, introduced[key]) ? result : result.concat(key);
    },
    [],
  ) as string[];
  // If any of the keys apart from 'handle' are unequal, yield `false`.
  return unequalKeys.some((inequality) => inequality !== "handle");
}

export { areOptionsEqual };
export type { Option };
