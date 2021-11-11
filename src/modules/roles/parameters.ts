import { Option, OptionType } from "../../commands/option.ts";

const role: Option = {
  name: "role",
  description: "The name of the role.",
  required: true,
  type: OptionType.ROLE,
};

export { role };
