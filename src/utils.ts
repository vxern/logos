import { _, ApplicationCommand, ApplicationCommandOption } from "../deps.ts";
import { Command } from "./commands/command.ts";
import { Option } from "./commands/option.ts";

/**
 * Makes one or more properties of `T` optional.
 *
 * @typeParam T - The type whose property to make partial.
 * @param K - The property to make partial.
 */
type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

/**
 * Compares an application command or option on the Discord API with an application
 * command or option defined on the {@link Client}.
 *
 * @param existent - The existent object saved in the Discord API.
 * @param introduced - The local object not yet saved to the API.
 * @returns The result of the comparison.
 */
function areEqual(
  left: ApplicationCommand | ApplicationCommandOption | undefined,
  right: Command | Option | undefined,
): boolean {
  // If both [left] and [right] are `undefined`, raise equality.
  if (!left && !right) {
    return true;
  }
  // If only one of either [left] or [right] is `undefined`, raise inequality.
  if (!(left && right)) {
    return false;
  }
  // Check which keys are not equal between the two objects.
  const unequalKeys = getUnequalKeys(left, right);
  if (unequalKeys.length === 1) {
    if (unequalKeys[0] !== "options") {
      return false;
    }

    if (!right.options && (!left.options || left.options.length !== 0)) {
      return false;
    }

    return left.options!.every((option, index) =>
      areEqual(option, right.options![index])
    );
  }
  // If any of the keys are unequal, yield `false`.
  return unequalKeys.length === 0;
}

function getUnequalKeys<T extends Object>(left: Object, right: T): string[] {
  return (_.reduce(
    left,
    (result: string[], value: unknown, key: keyof T) => {
      return _.isEqual(value, right[key])
        ? result
        : result.concat(key.toString());
    },
    [],
  ) as string[]).filter((key) => right.hasOwnProperty(key));
}

export { areEqual };
export type { Optional };
