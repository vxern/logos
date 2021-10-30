import { ApplicationCommandOptionType } from "../../../deps.ts";
import { Option } from "../option.ts";

const role: Option = {
  name: "role",
  description: "The name of the role.",
  required: true,
  type: ApplicationCommandOptionType.ROLE,
};

export { role };
