import {
  ApplicationCommandOption,
  ApplicationCommandOptionType,
} from "../../deps.ts";
import { InteractionHandler } from "./command.ts";

interface Option {
  name: string;
  description: string;
  options?: Option[];
  required?: boolean;
  default?: boolean;
  type: ApplicationCommandOptionType;
  handle?: InteractionHandler;
}

function areOptionsIdentical(
  existent: ApplicationCommandOption | ApplicationCommandOption[] | undefined,
  introduced: Option | Option[] | undefined,
): boolean {
  const existentIsEmpty = Array.isArray(existent)
    ? (existent as ApplicationCommandOption[]).length === 0
    : false;
  // If `existent` is empty or undefined and `introduced` is `undefined`
  if ((!existent || existentIsEmpty) && !introduced) {
    return true;
  }
  // If exclusively `existent` is empty or undefined or if exclusively `introduced` is `undefined`
  if (!(existent && introduced)) {
    return false;
  }
  if (Array.isArray(existent) || Array.isArray(introduced)) {
    const existentOptions = existent as ApplicationCommandOption[];
    const introducedOptions = introduced as Option[];
    return existentOptions.length === introducedOptions.length &&
      existentOptions.every((option, index) =>
        areOptionsIdentical(option, introducedOptions[index])
      );
  }
  const equalities = [
    existent!.name === introduced.name,
    existent!.description === introduced.description,
    existent!.type === introduced.type,
    existent!.required === (introduced.required ? true : undefined),
    existent!.default === introduced.default,
    areOptionsIdentical(existent!.options, introduced.options),
  ];
  return equalities.every((x) => x);
}

export { areOptionsIdentical };
export type { Option };
